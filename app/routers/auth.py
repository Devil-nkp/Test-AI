"""
PrepVista AI — Auth Router
Handles signup, login, and token refresh via Supabase Auth.
"""

import structlog
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr

from app.config import get_settings
from app.database.connection import DatabaseConnection

router = APIRouter()
logger = structlog.get_logger("prepvista.auth")


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OnboardingRequest(BaseModel):
    prep_goal: str = ""
    full_name: str = ""


@router.post("/signup")
async def signup(req: SignupRequest):
    """Register a new user via Supabase Auth."""
    import httpx
    settings = get_settings()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/signup",
                json={"email": req.email, "password": req.password},
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()

            if resp.status_code >= 400:
                detail = data.get("msg") or data.get("message") or data.get("error_description") or "Signup failed."
                raise HTTPException(status_code=resp.status_code, detail=detail)

            user = data.get("user", {})
            user_id = user.get("id")

            if user_id:
                # Create profile record
                async with DatabaseConnection() as conn:
                    await conn.execute(
                        """INSERT INTO profiles (id, email, full_name, plan)
                           VALUES ($1, $2, $3, 'free')
                           ON CONFLICT (id) DO UPDATE SET full_name = $3""",
                        user_id, req.email, req.full_name,
                    )

            return {
                "user": {"id": user_id, "email": req.email},
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in"),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("signup_error", error=str(e))
        raise HTTPException(status_code=500, detail="Signup service unavailable.")


@router.post("/login")
async def login(req: LoginRequest):
    """Authenticate user via Supabase Auth."""
    import httpx
    settings = get_settings()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=password",
                json={"email": req.email, "password": req.password},
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()

            if resp.status_code >= 400:
                detail = data.get("error_description") or data.get("msg") or "Invalid credentials."
                raise HTTPException(status_code=401, detail=detail)

            user = data.get("user", {})
            user_id = user.get("id")

            # Ensure profile exists
            if user_id:
                async with DatabaseConnection() as conn:
                    await conn.execute(
                        """INSERT INTO profiles (id, email, plan)
                           VALUES ($1, $2, 'free')
                           ON CONFLICT (id) DO NOTHING""",
                        user_id, req.email,
                    )

            return {
                "user": {"id": user_id, "email": req.email},
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in"),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("login_error", error=str(e))
        raise HTTPException(status_code=500, detail="Login service unavailable.")


@router.post("/refresh")
async def refresh_token(request: Request):
    """Refresh an expired access token."""
    import httpx
    settings = get_settings()

    body = await request.json()
    refresh = body.get("refresh_token")
    if not refresh:
        raise HTTPException(status_code=400, detail="refresh_token is required.")

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
                json={"refresh_token": refresh},
                headers={
                    "apikey": settings.SUPABASE_ANON_KEY,
                    "Content-Type": "application/json",
                },
            )
            data = resp.json()

            if resp.status_code >= 400:
                raise HTTPException(status_code=401, detail="Token refresh failed. Please log in again.")

            return {
                "access_token": data.get("access_token"),
                "refresh_token": data.get("refresh_token"),
                "expires_in": data.get("expires_in"),
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("refresh_error", error=str(e))
        raise HTTPException(status_code=500, detail="Auth service unavailable.")


@router.post("/onboarding")
async def complete_onboarding(req: OnboardingRequest, request: Request):
    """Complete the onboarding wizard."""
    from app.dependencies import get_current_user
    user = await get_current_user(request)

    async with DatabaseConnection() as conn:
        await conn.execute(
            """UPDATE profiles
               SET onboarding_completed = TRUE, prep_goal = $2, full_name = COALESCE(NULLIF($3, ''), full_name)
               WHERE id = $1""",
            user.id, req.prep_goal, req.full_name,
        )

    return {"status": "ok", "message": "Onboarding complete."}


@router.get("/me")
async def get_me(request: Request):
    """Get current user profile."""
    from app.dependencies import get_current_user
    user = await get_current_user(request)

    async with DatabaseConnection() as conn:
        row = await conn.fetchrow(
            """SELECT full_name, email, plan, subscription_status, onboarding_completed,
                      prep_goal, interviews_used_this_period, created_at
               FROM profiles WHERE id = $1""",
            user.id,
        )

    if not row:
        raise HTTPException(status_code=404, detail="Profile not found.")

    from app.services.quota import get_usage_stats
    usage = await get_usage_stats(user.id)

    return {
        "id": user.id,
        "full_name": row["full_name"],
        "email": row["email"],
        "plan": row["plan"],
        "subscription_status": row["subscription_status"],
        "onboarding_completed": row["onboarding_completed"],
        "prep_goal": row["prep_goal"],
        "usage": usage,
        "created_at": str(row["created_at"]),
    }
