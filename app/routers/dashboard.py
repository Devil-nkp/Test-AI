"""
PrepVista AI — Dashboard Router
User dashboard: session history, stats, skill tracking.
"""

import json
import structlog
from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, UserProfile
from app.services.quota import get_usage_stats
from app.database.connection import DatabaseConnection

router = APIRouter()
logger = structlog.get_logger("prepvista.dashboard")


@router.get("")
async def get_dashboard(user: UserProfile = Depends(get_current_user)):
    """Get dashboard data: stats, recent sessions, usage."""
    async with DatabaseConnection() as conn:
        # Profile info
        profile = await conn.fetchrow(
            "SELECT full_name, plan, onboarding_completed, prep_goal FROM profiles WHERE id = $1",
            user.id,
        )

        # Recent sessions
        sessions = await conn.fetch(
            """SELECT id, plan, final_score, rubric_scores, state,
                      total_turns, duration_actual_seconds, created_at
               FROM interview_sessions
               WHERE user_id = $1
               ORDER BY created_at DESC
               LIMIT 10""",
            user.id,
        )

        # Average score
        avg_row = await conn.fetchrow(
            """SELECT AVG(final_score) as avg_score, COUNT(*) as total_sessions
               FROM interview_sessions
               WHERE user_id = $1 AND state = 'FINISHED'""",
            user.id,
        )

        # Skill scores (latest per category)
        skills = await conn.fetch(
            """SELECT DISTINCT ON (category) category, average_score, recorded_at
               FROM skill_scores
               WHERE user_id = $1
               ORDER BY category, recorded_at DESC""",
            user.id,
        )

    # Build session list
    session_list = []
    for s in sessions:
        session_list.append({
            "id": str(s["id"]),
            "plan": s["plan"],
            "score": float(s["final_score"]) if s["final_score"] else None,
            "state": s["state"],
            "total_turns": s["total_turns"],
            "duration": s["duration_actual_seconds"],
            "created_at": str(s["created_at"]),
        })

    # Build skill map
    skill_map = {}
    for sk in skills:
        skill_map[sk["category"]] = {
            "score": float(sk["average_score"]),
            "last_updated": str(sk["recorded_at"]),
        }

    usage = await get_usage_stats(user.id)

    avg_score = round(float(avg_row["avg_score"]), 1) if avg_row and avg_row["avg_score"] else None
    total_sessions = avg_row["total_sessions"] if avg_row else 0

    return {
        "user": {
            "name": profile["full_name"] if profile else None,
            "plan": profile["plan"] if profile else "free",
            "onboarding_completed": profile["onboarding_completed"] if profile else False,
            "prep_goal": profile["prep_goal"] if profile else None,
        },
        "stats": {
            "total_sessions": total_sessions,
            "average_score": avg_score,
        },
        "usage": usage,
        "recent_sessions": session_list,
        "skill_scores": skill_map,
    }


@router.get("/sessions")
async def get_session_history(
    user: UserProfile = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0,
):
    """Get paginated session history."""
    from app.config import PLAN_CONFIG
    plan_cfg = PLAN_CONFIG.get(user.plan, PLAN_CONFIG["free"])

    if not plan_cfg["has_session_history"]:
        return {
            "sessions": [],
            "total": 0,
            "locked": True,
            "message": "Session history is available on Pro and Career plans.",
        }

    async with DatabaseConnection() as conn:
        total_row = await conn.fetchrow(
            "SELECT COUNT(*) as total FROM interview_sessions WHERE user_id = $1",
            user.id,
        )
        sessions = await conn.fetch(
            """SELECT id, plan, final_score, state, total_turns,
                      duration_actual_seconds, created_at, finished_at
               FROM interview_sessions
               WHERE user_id = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3""",
            user.id, min(limit, 50), offset,
        )

    return {
        "sessions": [
            {
                "id": str(s["id"]),
                "plan": s["plan"],
                "score": float(s["final_score"]) if s["final_score"] else None,
                "state": s["state"],
                "total_turns": s["total_turns"],
                "duration": s["duration_actual_seconds"],
                "created_at": str(s["created_at"]),
                "finished_at": str(s["finished_at"]) if s["finished_at"] else None,
            }
            for s in sessions
        ],
        "total": total_row["total"] if total_row else 0,
        "locked": False,
    }


@router.get("/skills")
async def get_skill_breakdown(user: UserProfile = Depends(get_current_user)):
    """Get detailed skill breakdown across all sessions."""
    async with DatabaseConnection() as conn:
        skills = await conn.fetch(
            """SELECT category, average_score, session_id, recorded_at
               FROM skill_scores
               WHERE user_id = $1
               ORDER BY recorded_at ASC""",
            user.id,
        )

    # Group by category for trend data
    category_trends: dict[str, list] = {}
    for sk in skills:
        cat = sk["category"]
        if cat not in category_trends:
            category_trends[cat] = []
        category_trends[cat].append({
            "score": float(sk["average_score"]),
            "date": str(sk["recorded_at"]),
        })

    return {"skill_trends": category_trends}
