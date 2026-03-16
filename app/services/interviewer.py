"""
PrepVista AI — Interviewer Service
Manages interview session lifecycle: setup, greeting, Q&A, finish.
"""

import json
import secrets
import structlog
from datetime import datetime, timezone

from app.config import PLAN_CONFIG, get_settings
from app.database.connection import DatabaseConnection
from app.services.llm import call_llm, call_llm_json
from app.services.prompts import (
    build_master_prompt,
    build_greeting_prompt,
    build_followup_prompt,
    build_question_plan_prompt,
)
from app.services.resume_parser import sanitize_resume_text
from app.services.transcript import normalize_transcript

logger = structlog.get_logger("prepvista.interviewer")


async def create_session(
    user_id: str,
    plan: str,
    resume_text: str,
    resume_summary: dict,
    resume_file_path: str | None,
    duration_seconds: int,
    proctoring_mode: str = "practice",
) -> dict:
    """Create a new interview session with pre-generated question plan."""
    cfg = PLAN_CONFIG.get(plan, PLAN_CONFIG["free"])
    access_token = secrets.token_urlsafe(32)
    sanitized_resume = sanitize_resume_text(resume_text)

    # Generate question plan
    question_plan = []
    try:
        plan_prompt = build_question_plan_prompt(plan, sanitized_resume, cfg["max_turns"])
        question_plan = await call_llm_json(
            [{"role": "system", "content": plan_prompt}],
            temperature=0.3,
        )
        if isinstance(question_plan, dict):
            question_plan = question_plan.get("question_plan", question_plan.get("questions", []))
    except Exception as e:
        logger.warning("question_plan_generation_failed", error=str(e))
        question_plan = []

    async with DatabaseConnection() as conn:
        row = await conn.fetchrow(
            """INSERT INTO interview_sessions
               (user_id, plan, resume_text, resume_summary, resume_file_path,
                question_plan, duration_planned_seconds, proctoring_mode, access_token)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
               RETURNING id, created_at""",
            user_id, plan, sanitized_resume,
            json.dumps(resume_summary) if isinstance(resume_summary, dict) else resume_summary,
            resume_file_path,
            json.dumps(question_plan) if isinstance(question_plan, (list, dict)) else "[]",
            duration_seconds, proctoring_mode, access_token,
        )

        # Record usage event
        await conn.execute(
            """INSERT INTO usage_events (user_id, event_type, metadata)
               VALUES ($1, 'interview_started', $2)""",
            user_id, json.dumps({"session_id": str(row["id"]), "plan": plan}),
        )

        # Increment usage counter
        await conn.execute(
            "UPDATE profiles SET interviews_used_this_period = interviews_used_this_period + 1 WHERE id = $1",
            user_id,
        )

    return {
        "session_id": str(row["id"]),
        "access_token": access_token,
        "plan": plan,
        "max_turns": cfg["max_turns"],
        "duration_seconds": duration_seconds,
        "proctoring_mode": proctoring_mode,
    }


async def process_answer(
    session_id: str,
    user_text: str,
    access_token: str,
) -> dict:
    """Process a user answer and return the next AI response."""

    async with DatabaseConnection() as conn:
        # Fetch session
        session = await conn.fetchrow(
            """SELECT id, user_id, plan, resume_text, resume_summary, question_plan,
                      state, total_turns, silence_count, consecutive_followups, skip_topics
               FROM interview_sessions
               WHERE id = $1 AND access_token = $2""",
            session_id, access_token,
        )

        if not session:
            return {"action": "error", "detail": "Invalid session or access token."}
        if session["state"] != "ACTIVE":
            return {"action": "error", "detail": "Interview session is no longer active."}

        plan = session["plan"]
        cfg = PLAN_CONFIG.get(plan, PLAN_CONFIG["free"])
        resume_text = session["resume_text"]
        total_turns = session["total_turns"]
        silence_count = session["silence_count"]
        consecutive_followups = session["consecutive_followups"]
        skip_topics = session["skip_topics"] or []
        resume_summary = session["resume_summary"]

        # Check if max turns reached
        if total_turns >= cfg["max_turns"]:
            return {"action": "finish", "detail": "Maximum questions reached."}

        # ── Build conversation history ───────────
        history_rows = await conn.fetch(
            """SELECT role, content FROM conversation_messages
               WHERE session_id = $1
               ORDER BY turn_number ASC, id ASC
               LIMIT $2""",
            session_id, get_settings().MAX_HISTORY_TURNS_IN_CONTEXT * 2,
        )
        conversation_history = [{"role": r["role"], "content": r["content"]} for r in history_rows]

        # ── Determine if greeting or follow-up ───
        is_greeting = total_turns == 0 and not user_text
        is_silent = not user_text or user_text.strip() in [
            "[NO_ANSWER_TIMEOUT]", "", "[SYSTEM_DURATION_EXPIRED]"
        ]

        # Track silence
        new_silence = silence_count + 1 if is_silent and not is_greeting else 0
        new_followups = consecutive_followups

        # Check for "I don't know"
        lower_text = user_text.lower().strip() if user_text else ""
        is_idk = any(phrase in lower_text for phrase in [
            "don't know", "dont know", "not sure", "no idea",
            "can't recall", "cant recall", "i forgot"
        ])

        # ── Store user message ───────────────────
        if user_text and not is_greeting:
            normalized = normalize_transcript(user_text)
            await conn.execute(
                """INSERT INTO conversation_messages (session_id, role, content, turn_number)
                   VALUES ($1, 'user', $2, $3)""",
                session_id, normalized, total_turns,
            )

        # ── Build system prompt ──────────────────
        if is_greeting:
            system_prompt = build_greeting_prompt(plan, resume_text, cfg)
        elif is_silent:
            system_prompt = build_followup_prompt(plan, resume_text, cfg, new_silence)
        else:
            system_prompt = build_master_prompt(plan, resume_text, cfg, new_silence, total_turns)

        # Add skip topics instruction
        if skip_topics:
            system_prompt += f"\n\nAVOID these topics (candidate couldn't answer): {', '.join(skip_topics)}"

        # Add follow-up depth control
        if new_followups >= 2 and not is_greeting:
            system_prompt += "\n\nYou MUST now move to a completely different topic. Do not ask any more follow-ups on the current subject."
            new_followups = 0

        # ── Call LLM ─────────────────────────────
        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history[-get_settings().MAX_HISTORY_TURNS_IN_CONTEXT * 2:])

        if user_text and not is_greeting:
            messages.append({"role": "user", "content": user_text})

        ai_response = await call_llm(
            messages=messages,
            temperature=cfg["temperature"],
        )

        # ── Store AI message ─────────────────────
        new_turn = total_turns + (0 if is_greeting else 1)
        await conn.execute(
            """INSERT INTO conversation_messages (session_id, role, content, turn_number)
               VALUES ($1, 'assistant', $2, $3)""",
            session_id, ai_response, new_turn,
        )

        # ── Update session state ─────────────────
        update_fields = {
            "total_turns": new_turn,
            "silence_count": new_silence,
            "consecutive_followups": new_followups + 1 if not is_greeting else 0,
        }
        if is_idk:
            skip_topics = list(skip_topics) + [f"turn_{total_turns}_topic"]

        await conn.execute(
            """UPDATE interview_sessions
               SET total_turns = $2, silence_count = $3, consecutive_followups = $4, skip_topics = $5
               WHERE id = $1""",
            session_id, update_fields["total_turns"], update_fields["silence_count"],
            update_fields["consecutive_followups"], skip_topics,
        )

    # Check if this should be the last turn
    should_finish = new_turn >= cfg["max_turns"] - 1

    return {
        "action": "continue" if not should_finish else "finish_after_this",
        "text": ai_response,
        "turn": new_turn,
        "max_turns": cfg["max_turns"],
        "question_for_eval": ai_response if not is_greeting else None,
    }


async def finish_session(session_id: str, access_token: str, duration_actual: int | None = None) -> dict:
    """Finalize the interview session and compute the final score."""
    from app.services.evaluator import compute_final_score, get_score_interpretation

    async with DatabaseConnection() as conn:
        session = await conn.fetchrow(
            "SELECT id, user_id, plan, state FROM interview_sessions WHERE id = $1 AND access_token = $2",
            session_id, access_token,
        )
        if not session:
            return {"error": "Invalid session."}
        if session["state"] != "ACTIVE":
            return {"error": "Session already finished."}

        # Fetch all per-question evaluations
        eval_rows = await conn.fetch(
            """SELECT rubric_category, score, communication_score, classification
               FROM question_evaluations WHERE session_id = $1 ORDER BY turn_number""",
            session_id,
        )
        evaluations = [dict(r) for r in eval_rows]

        # Compute deterministic final score
        result = compute_final_score(evaluations)
        interpretation = get_score_interpretation(result["final_score"])

        # Update session
        await conn.execute(
            """UPDATE interview_sessions
               SET state = 'FINISHED', final_score = $2, rubric_scores = $3,
                   strengths = $4, weaknesses = $5, finished_at = NOW(),
                   duration_actual_seconds = $6
               WHERE id = $1""",
            session_id, result["final_score"],
            json.dumps(result["category_scores"]),
            result["strengths"], result["weaknesses"],
            duration_actual,
        )

        # Record completion event
        await conn.execute(
            """INSERT INTO usage_events (user_id, event_type, metadata)
               VALUES ($1, 'interview_completed', $2)""",
            session["user_id"],
            json.dumps({"session_id": str(session_id), "score": result["final_score"]}),
        )

    return {
        "final_score": result["final_score"],
        "interpretation": interpretation,
        "category_scores": result["category_scores"],
        "strengths": result["strengths"],
        "weaknesses": result["weaknesses"],
        "total_questions": result["total_questions"],
        "answered_questions": result["answered_questions"],
        "strongest_category": result["strongest_category"],
        "weakest_category": result["weakest_category"],
        "report_url": f"/reports/{session_id}",
    }
