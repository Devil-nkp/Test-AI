"""
PrepVista AI — Interviews Router
Core interview lifecycle: setup, answer, finish.
"""

import json
import asyncio
import structlog
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel

from app.dependencies import get_current_user, UserProfile
from app.middleware.rate_limiter import rate_limit_user, rate_limit_session
from app.services.quota import enforce_quota
from app.services.resume_parser import extract_text_from_pdf, validate_pdf_upload, parse_resume_structured
from app.services.interviewer import create_session, process_answer, finish_session
from app.services.evaluator import evaluate_single_question
from app.database.connection import DatabaseConnection

router = APIRouter()
logger = structlog.get_logger("prepvista.interviews")


class AnswerRequest(BaseModel):
    user_text: str = ""
    access_token: str


class FinishRequest(BaseModel):
    access_token: str
    duration_actual: int | None = None


class ProctoringViolation(BaseModel):
    access_token: str
    violation_type: str
    detail: str = ""


@router.post("/setup")
async def setup_interview(
    request: Request,
    resume: UploadFile = File(...),
    plan: str = Form("free"),
    duration: int = Form(600),
    proctoring_mode: str = Form("practice"),
    user: UserProfile = Depends(get_current_user),
):
    """Set up a new interview session."""
    await rate_limit_user(user.id)
    await enforce_quota(user)

    # Validate plan
    from app.config import VALID_PLANS
    if plan not in VALID_PLANS:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")

    # Enforce plan access
    from app.config import PLAN_CONFIG
    PLAN_HIERARCHY = {"free": 0, "pro": 1, "career": 2}
    if PLAN_HIERARCHY.get(plan, 0) > PLAN_HIERARCHY.get(user.plan, 0):
        raise HTTPException(
            status_code=403,
            detail=f"Your current plan ({user.plan}) does not include {plan} features. Upgrade to access.",
        )

    # Validate and parse resume
    pdf_bytes = await resume.read()
    validate_pdf_upload(pdf_bytes, resume.filename or "resume.pdf")
    resume_text = extract_text_from_pdf(pdf_bytes)

    # Parse structured resume data
    resume_summary = await parse_resume_structured(resume_text)

    # Clamp duration
    duration = max(300, min(1800, duration))  # 5 min to 30 min

    # Create session
    result = await create_session(
        user_id=user.id,
        plan=plan,
        resume_text=resume_text,
        resume_summary=resume_summary,
        resume_file_path=None,  # TODO: upload to Supabase Storage
        duration_seconds=duration,
        proctoring_mode=proctoring_mode,
    )

    logger.info("interview_setup", user_id=user.id, session_id=result["session_id"], plan=plan)

    return {
        "session_id": result["session_id"],
        "access_token": result["access_token"],
        "plan": result["plan"],
        "max_turns": result["max_turns"],
        "duration_seconds": result["duration_seconds"],
        "proctoring_mode": result["proctoring_mode"],
        "candidate_name": resume_summary.get("candidate_name", "Candidate"),
    }


@router.post("/{session_id}/answer")
async def submit_answer(
    session_id: str,
    req: AnswerRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    user: UserProfile = Depends(get_current_user),
):
    """Submit a user answer and get the next AI question."""
    await rate_limit_session(session_id)

    # Validate answer length
    from app.config import get_settings
    if req.user_text and len(req.user_text) > get_settings().MAX_ANSWER_TEXT_LENGTH:
        req.user_text = req.user_text[:get_settings().MAX_ANSWER_TEXT_LENGTH]

    # Process the answer
    result = await process_answer(
        session_id=session_id,
        user_text=req.user_text,
        access_token=req.access_token,
    )

    if result.get("action") == "error":
        raise HTTPException(status_code=400, detail=result["detail"])

    # Background: evaluate the question asynchronously
    if req.user_text and req.user_text.strip() and result.get("question_for_eval"):
        background_tasks.add_task(
            _background_evaluate,
            session_id=session_id,
            turn_number=result.get("turn", 0),
            question_text=result.get("question_for_eval", ""),
            raw_answer=req.user_text,
            user_id=user.id,
        )

    return result


@router.post("/{session_id}/finish")
async def end_interview(
    session_id: str,
    req: FinishRequest,
    user: UserProfile = Depends(get_current_user),
):
    """Finish the interview and compute final results."""
    result = await finish_session(
        session_id=session_id,
        access_token=req.access_token,
        duration_actual=req.duration_actual,
    )

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    logger.info("interview_finished", session_id=session_id, score=result["final_score"])
    return result


@router.post("/{session_id}/violation")
async def report_violation(
    session_id: str,
    req: ProctoringViolation,
    user: UserProfile = Depends(get_current_user),
):
    """Log a proctoring violation from the client."""
    async with DatabaseConnection() as conn:
        session = await conn.fetchrow(
            "SELECT id, proctoring_violations FROM interview_sessions WHERE id = $1 AND access_token = $2",
            session_id, req.access_token,
        )
        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")

        violations = json.loads(session["proctoring_violations"]) if session["proctoring_violations"] else []
        violations.append({
            "type": req.violation_type,
            "detail": req.detail,
            "timestamp": "now",
        })

        await conn.execute(
            "UPDATE interview_sessions SET proctoring_violations = $1 WHERE id = $2",
            json.dumps(violations), session_id,
        )

    return {"status": "violation_recorded"}


# ── Background task ──────────────────────────────────

async def _background_evaluate(
    session_id: str,
    turn_number: int,
    question_text: str,
    raw_answer: str,
    user_id: str,
):
    """Run per-question evaluation in background (non-blocking)."""
    try:
        async with DatabaseConnection() as conn:
            session = await conn.fetchrow(
                "SELECT plan, resume_summary, question_plan FROM interview_sessions WHERE id = $1",
                session_id,
            )
            if not session:
                return

            plan = session["plan"]
            resume_summary = session["resume_summary"] or "{}"
            question_plan = json.loads(session["question_plan"]) if session["question_plan"] else []

            # Determine rubric category from question plan
            rubric_category = "technical_depth"  # default
            if isinstance(question_plan, list):
                for q in question_plan:
                    if isinstance(q, dict) and q.get("turn") == turn_number:
                        rubric_category = q.get("category", "technical_depth")
                        break

            # Run evaluation
            eval_result = await evaluate_single_question(
                question_text=question_text,
                raw_answer=raw_answer,
                resume_summary=str(resume_summary),
                rubric_category=rubric_category,
                plan=plan,
            )

            # Store evaluation
            await conn.execute(
                """INSERT INTO question_evaluations
                   (session_id, turn_number, rubric_category, question_text,
                    raw_answer, normalized_answer, classification, score,
                    scoring_rationale, missing_elements, ideal_answer,
                    communication_score, communication_notes)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)""",
                session_id, turn_number, rubric_category, question_text,
                eval_result["raw_answer"], eval_result["normalized_answer"],
                eval_result["classification"], eval_result["score"],
                eval_result["scoring_rationale"], eval_result["missing_elements"],
                eval_result["ideal_answer"], eval_result["communication_score"],
                eval_result["communication_notes"],
            )

            logger.info("question_evaluated", session_id=session_id, turn=turn_number,
                       score=eval_result["score"], category=rubric_category)

    except Exception as e:
        logger.error("background_eval_failed", session_id=session_id, turn=turn_number, error=str(e))
