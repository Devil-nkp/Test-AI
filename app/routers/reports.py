"""
PrepVista AI — Reports Router
Retrieve interview reports and download PDFs.
"""

import json
import structlog
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse
import io

from app.dependencies import get_current_user, require_plan, UserProfile
from app.config import PLAN_CONFIG
from app.database.connection import DatabaseConnection
from app.services.evaluator import get_score_interpretation

router = APIRouter()
logger = structlog.get_logger("prepvista.reports")


@router.get("/{session_id}")
async def get_report(
    session_id: str,
    user: UserProfile = Depends(get_current_user),
):
    """Get the full interview report for a session."""
    async with DatabaseConnection() as conn:
        session = await conn.fetchrow(
            """SELECT id, user_id, plan, final_score, rubric_scores,
                      strengths, weaknesses, total_turns, duration_actual_seconds,
                      state, created_at, finished_at, proctoring_mode, proctoring_violations
               FROM interview_sessions
               WHERE id = $1 AND user_id = $2""",
            session_id, user.id,
        )

        if not session:
            raise HTTPException(status_code=404, detail="Report not found.")

        if session["state"] != "FINISHED":
            raise HTTPException(status_code=400, detail="Interview not yet completed.")

        # Fetch per-question evaluations
        eval_rows = await conn.fetch(
            """SELECT turn_number, rubric_category, question_text, raw_answer,
                      normalized_answer, classification, score, scoring_rationale,
                      missing_elements, ideal_answer, communication_score, communication_notes
               FROM question_evaluations
               WHERE session_id = $1
               ORDER BY turn_number""",
            session_id,
        )

    plan = session["plan"]
    plan_cfg = PLAN_CONFIG.get(plan, PLAN_CONFIG["free"])
    score = float(session["final_score"]) if session["final_score"] else 0

    # Build per-question data with plan-based gating
    questions = []
    for row in eval_rows:
        q = {
            "turn": row["turn_number"],
            "category": row["rubric_category"],
            "question": row["question_text"],
            "answer": row["normalized_answer"] or row["raw_answer"] or "",
            "classification": row["classification"],
            "score": float(row["score"]),
        }

        # Only include detailed coaching for paid plans
        if plan_cfg["has_ideal_answers"]:
            q["scoring_rationale"] = row["scoring_rationale"]
            q["missing_elements"] = row["missing_elements"] or []
            q["ideal_answer"] = row["ideal_answer"]
            q["communication_score"] = float(row["communication_score"]) if row["communication_score"] else 0
            q["communication_notes"] = row["communication_notes"]
        else:
            q["scoring_rationale"] = None
            q["missing_elements"] = None
            q["ideal_answer"] = None  # Locked for free users
            q["locked"] = True

        questions.append(q)

    rubric_scores = json.loads(session["rubric_scores"]) if session["rubric_scores"] else {}
    violations = json.loads(session["proctoring_violations"]) if session["proctoring_violations"] else []

    return {
        "session_id": session_id,
        "plan": plan,
        "final_score": score,
        "interpretation": get_score_interpretation(int(score)),
        "rubric_scores": rubric_scores if plan_cfg["has_rubric_breakdown"] else None,
        "strengths": session["strengths"] or [],
        "weaknesses": session["weaknesses"] or [],
        "questions": questions,
        "total_questions": session["total_turns"],
        "duration_seconds": session["duration_actual_seconds"],
        "proctoring_mode": session["proctoring_mode"],
        "proctoring_violations_count": len(violations),
        "created_at": str(session["created_at"]),
        "finished_at": str(session["finished_at"]) if session["finished_at"] else None,
        "has_pdf": plan_cfg["has_pdf_report"],
        "has_ideal_answers": plan_cfg["has_ideal_answers"],
        "has_rubric_breakdown": plan_cfg["has_rubric_breakdown"],
    }


@router.get("/{session_id}/pdf")
async def download_pdf(
    session_id: str,
    user: UserProfile = Depends(require_plan("pro")),
):
    """Download the interview report as a PDF. Pro/Career only."""
    async with DatabaseConnection() as conn:
        session = await conn.fetchrow(
            """SELECT id, user_id, plan, final_score, rubric_scores,
                      strengths, weaknesses, total_turns,
                      duration_actual_seconds, created_at
               FROM interview_sessions
               WHERE id = $1 AND user_id = $2 AND state = 'FINISHED'""",
            session_id, user.id,
        )

        if not session:
            raise HTTPException(status_code=404, detail="Report not found or interview not completed.")

        eval_rows = await conn.fetch(
            """SELECT turn_number, rubric_category, question_text, normalized_answer,
                      classification, score, scoring_rationale,
                      missing_elements, ideal_answer
               FROM question_evaluations
               WHERE session_id = $1
               ORDER BY turn_number""",
            session_id,
        )

    # Build PDF using report builder
    from app.services.report_builder import generate_pdf_report

    pdf_bytes = await generate_pdf_report(
        session=dict(session),
        evaluations=[dict(r) for r in eval_rows],
        user_email=user.email,
    )

    logger.info("pdf_downloaded", session_id=session_id, user_id=user.id)

    # Record usage
    async with DatabaseConnection() as conn:
        await conn.execute(
            "INSERT INTO usage_events (user_id, event_type, metadata) VALUES ($1, 'report_downloaded', $2)",
            user.id, json.dumps({"session_id": session_id}),
        )

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=PrepVista_Report_{session_id[:8]}.pdf"},
    )
