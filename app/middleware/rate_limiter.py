"""
PrepVista AI — Redis-Based Rate Limiter
Sliding window rate limiting using Upstash Redis REST API.
Falls back to in-memory if Redis is unavailable.
"""

import time
import httpx
import structlog
from collections import defaultdict
from fastapi import Request, HTTPException

from app.config import get_settings

logger = structlog.get_logger("prepvista.ratelimit")

# ── In-memory fallback ───────────────────────────────
_memory_store: dict[str, list[float]] = defaultdict(list)


async def _redis_rate_check(key: str, limit: int, window: int) -> bool:
    """Check rate limit via Upstash Redis REST API. Returns True if allowed."""
    settings = get_settings()
    if not settings.UPSTASH_REDIS_URL or not settings.UPSTASH_REDIS_TOKEN:
        return _memory_rate_check(key, limit, window)

    now = time.time()
    try:
        async with httpx.AsyncClient() as client:
            # Pipeline: ZREMRANGEBYSCORE, ZADD, ZCARD, EXPIRE
            pipeline = [
                ["ZREMRANGEBYSCORE", key, "0", str(now - window)],
                ["ZADD", key, str(now), f"{now}"],
                ["ZCARD", key],
                ["EXPIRE", key, str(window)],
            ]
            resp = await client.post(
                f"{settings.UPSTASH_REDIS_URL}/pipeline",
                headers={"Authorization": f"Bearer {settings.UPSTASH_REDIS_TOKEN}"},
                json=pipeline,
                timeout=3.0,
            )
            results = resp.json()
            count = results[2]["result"] if isinstance(results[2], dict) else results[2]
            return int(count) <= limit
    except Exception as e:
        logger.warning("redis_rate_limit_fallback", error=str(e))
        return _memory_rate_check(key, limit, window)


def _memory_rate_check(key: str, limit: int, window: int) -> bool:
    """In-memory sliding window fallback."""
    now = time.time()
    _memory_store[key] = [t for t in _memory_store[key] if now - t < window]
    if len(_memory_store[key]) >= limit:
        return False
    _memory_store[key].append(now)
    return True


async def rate_limit_ip(request: Request):
    """Rate limit by client IP for anonymous endpoints."""
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    key = f"rl:ip:{client_ip}"
    allowed = await _redis_rate_check(key, settings.RATE_LIMIT_ANONYMOUS, 60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a moment.")


async def rate_limit_user(user_id: str):
    """Rate limit by authenticated user ID."""
    settings = get_settings()
    key = f"rl:user:{user_id}"
    allowed = await _redis_rate_check(key, settings.RATE_LIMIT_AUTHENTICATED, 60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")


async def rate_limit_session(session_id: str):
    """Rate limit per interview session (prevents automation)."""
    settings = get_settings()
    key = f"rl:session:{session_id}"
    allowed = await _redis_rate_check(key, settings.RATE_LIMIT_INTERVIEW, 60)
    if not allowed:
        raise HTTPException(status_code=429, detail="Too many requests for this session.")
