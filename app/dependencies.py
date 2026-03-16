"""
PrepVista AI — FastAPI Dependencies
Common dependencies injected into route handlers.
"""

import jwt
import structlog
from fastapi import Request, HTTPException, Depends
from app.config import get_settings
from app.database.connection import get_db

logger = structlog.get_logger("prepvista.auth")


class UserProfile:
    """Simple user context object attached to authenticated requests."""
    def __init__(self, id: str, email: str, plan: str, is_admin: bool = False,
                 interviews_used: int = 0, subscription_status: str = "none"):
        self.id = id
        self.email = email
        self.plan = plan
        self.is_admin = is_admin
        self.interviews_used = interviews_used
        self.subscription_status = subscription_status


async def get_current_user(request: Request) -> UserProfile:
    """Extract and verify JWT from Authorization header or cookie."""
    settings = get_settings()

    # Try Authorization header first, then cookie
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split("Bearer ")[1]
    else:
        token = request.cookies.get("sb-access-token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        email = payload.get("email", "")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except jwt.InvalidTokenError as e:
        logger.warning("invalid_jwt", error=str(e))
        raise HTTPException(status_code=401, detail="Invalid token.")

    # Fetch profile from database
    db = await get_db()
    row = await db.fetchrow(
        "SELECT plan, is_admin, interviews_used_this_period, subscription_status FROM profiles WHERE id = $1",
        user_id,
    )

    if not row:
        # First login — create profile
        await db.execute(
            """INSERT INTO profiles (id, email, plan, is_admin, interviews_used_this_period, subscription_status)
               VALUES ($1, $2, 'free', FALSE, 0, 'none')
               ON CONFLICT (id) DO NOTHING""",
            user_id, email,
        )
        return UserProfile(id=user_id, email=email, plan="free")

    return UserProfile(
        id=user_id,
        email=email,
        plan=row["plan"],
        is_admin=row["is_admin"] or False,
        interviews_used=row["interviews_used_this_period"] or 0,
        subscription_status=row["subscription_status"] or "none",
    )


def require_plan(minimum: str):
    """Dependency that gates access based on plan tier."""
    PLAN_HIERARCHY = {"free": 0, "pro": 1, "career": 2}

    async def dependency(user: UserProfile = Depends(get_current_user)):
        if PLAN_HIERARCHY.get(user.plan, 0) < PLAN_HIERARCHY.get(minimum, 0):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "plan_required",
                    "message": f"This feature requires the {minimum.title()} plan or higher.",
                    "required": minimum,
                    "current": user.plan,
                    "upgrade_url": "/pricing",
                },
            )
        return user

    return dependency
