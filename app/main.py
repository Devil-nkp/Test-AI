"""
PrepVista AI — FastAPI Application Factory
Production entry point. Registers all routers, middleware, and lifecycle events.
"""

import logging
import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.middleware.error_handler import register_error_handlers
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.database.connection import init_db_pool, close_db_pool
from app.routers import auth, interviews, reports, dashboard, billing


# ── Structured Logging ───────────────────────────────
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if get_settings().DEBUG else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger("prepvista")


# ── Application Lifecycle ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    settings = get_settings()
    logger.info("starting_prepvista", version=settings.APP_VERSION, env=settings.ENVIRONMENT)
    await init_db_pool()
    yield
    await close_db_pool()
    logger.info("shutdown_complete")


# ── App Factory ──────────────────────────────────────
def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────
    allowed_origins = [settings.FRONTEND_URL]
    if settings.DEBUG:
        allowed_origins.append("http://localhost:3000")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    # ── Security Headers ─────────────────────────
    app.add_middleware(SecurityHeadersMiddleware)

    # ── Error Handlers ───────────────────────────
    register_error_handlers(app)

    # ── Routers ──────────────────────────────────
    app.include_router(auth.router, prefix="/auth", tags=["Auth"])
    app.include_router(interviews.router, prefix="/interviews", tags=["Interviews"])
    app.include_router(reports.router, prefix="/reports", tags=["Reports"])
    app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
    app.include_router(billing.router, prefix="/billing", tags=["Billing"])

    # ── Health Check ─────────────────────────────
    @app.get("/health")
    async def health():
        return {"status": "ok", "app": settings.APP_NAME, "version": settings.APP_VERSION}

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn
    port = int(get_settings().BACKEND_URL.split(":")[-1]) if ":" in get_settings().BACKEND_URL else 8000
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=get_settings().DEBUG)
