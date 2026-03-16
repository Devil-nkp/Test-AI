"""
PrepVista AI — Quota Enforcement Service
Server-side interview quota tracking and plan limit enforcement.
"""

import structlog
from fastapi import HTTPException

from app.config import PLAN_CONFIG
from app.database.connection import DatabaseConnection
from app.dependencies import UserProfile

logger = structlog.get_logger("prepvista.quota")


async def enforce_quota(user: UserProfile):
    """Check if user has remaining interviews in their billing period."""
    plan_cfg = PLAN_CONFIG.get(user.plan, PLAN_CONFIG["free"])
    limit = plan_cfg["interviews_per_month"]

    async with DatabaseConnection() as conn:
        row = await conn.fetchrow(
            "SELECT interviews_used_this_period FROM profiles WHERE id = $1",
            user.id,
        )
        used = row["interviews_used_this_period"] if row else 0

    if used >= limit:
        logger.info("quota_exceeded", user_id=user.id, plan=user.plan, used=used, limit=limit)
        raise HTTPException(
            status_code=402,
            detail={
                "error": "quota_exceeded",
                "message": f"You've used all {limit} interviews for this billing period.",
                "used": used,
                "limit": limit,
                "plan": user.plan,
                "upgrade_url": "/pricing",
            },
        )

    logger.info("quota_check_passed", user_id=user.id, used=used, limit=limit)


async def get_usage_stats(user_id: str) -> dict:
    """Get current usage statistics for a user."""
    async with DatabaseConnection() as conn:
        profile = await conn.fetchrow(
            "SELECT plan, interviews_used_this_period, period_start FROM profiles WHERE id = $1",
            user_id,
        )
        if not profile:
            return {"plan": "free", "used": 0, "limit": 2, "remaining": 2}

        plan = profile["plan"]
        used = profile["interviews_used_this_period"] or 0
        limit = PLAN_CONFIG.get(plan, PLAN_CONFIG["free"])["interviews_per_month"]
        remaining = max(0, limit - used)

        return {
            "plan": plan,
            "used": used,
            "limit": limit,
            "remaining": remaining,
            "period_start": str(profile["period_start"]) if profile["period_start"] else None,
        }


async def reset_period_usage(user_id: str):
    """Reset interview count for a new billing period."""
    async with DatabaseConnection() as conn:
        await conn.execute(
            "UPDATE profiles SET interviews_used_this_period = 0, period_start = NOW() WHERE id = $1",
            user_id,
        )
    logger.info("quota_reset", user_id=user_id)
