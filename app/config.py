"""
PrepVista AI — Application Configuration
Uses Pydantic Settings for type-safe env var management.
"""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Central configuration. All values loaded from environment variables."""

    # ── App ──────────────────────────────────────────
    APP_NAME: str = "PrepVista AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"  # "development" | "production"
    FRONTEND_URL: str = "http://localhost:3000"
    BACKEND_URL: str = "http://localhost:8000"

    # ── Supabase ─────────────────────────────────────
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(..., description="Supabase anonymous/public key")
    SUPABASE_SERVICE_KEY: str = Field(..., description="Supabase service role key (server-only)")
    SUPABASE_JWT_SECRET: str = Field(..., description="JWT secret for verifying tokens")
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")

    # ── Stripe ───────────────────────────────────────
    STRIPE_SECRET_KEY: str = Field(..., description="Stripe secret API key")
    STRIPE_WEBHOOK_SECRET: str = Field(..., description="Stripe webhook signing secret")
    STRIPE_PRO_PRICE_ID: str = Field(..., description="Stripe Price ID for Pro plan")
    STRIPE_CAREER_PRICE_ID: str = Field(..., description="Stripe Price ID for Career plan")

    # ── LLM Providers ────────────────────────────────
    GROQ_API_KEY: str = Field(..., description="Groq API key")
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_EVAL_MODEL: str = "llama-3.3-70b-versatile"
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key (fallback)")
    OPENAI_MODEL: str = "gpt-4o-mini"

    # ── Upstash Redis ────────────────────────────────
    UPSTASH_REDIS_URL: str = Field(default="", description="Upstash Redis REST URL")
    UPSTASH_REDIS_TOKEN: str = Field(default="", description="Upstash Redis REST token")

    # ── Resend (Email) ───────────────────────────────
    RESEND_API_KEY: str = Field(default="", description="Resend API key for transactional email")
    FROM_EMAIL: str = "PrepVista AI <noreply@prepvista.ai>"

    # ── Plan Configuration ───────────────────────────
    FREE_INTERVIEWS_PER_MONTH: int = 2
    PRO_INTERVIEWS_PER_MONTH: int = 15
    CAREER_INTERVIEWS_PER_MONTH: int = 9999  # effectively unlimited

    # ── Interview Defaults ───────────────────────────
    MAX_RESUME_SIZE_BYTES: int = 5 * 1024 * 1024  # 5MB
    MAX_RESUME_TEXT_LENGTH: int = 6000
    MAX_ANSWER_TEXT_LENGTH: int = 5000
    DEFAULT_LLM_TIMEOUT: float = 15.0
    LLM_RETRIES: int = 3
    MAX_HISTORY_TURNS_IN_CONTEXT: int = 8

    # ── Rate Limiting ────────────────────────────────
    RATE_LIMIT_ANONYMOUS: int = 20       # per minute per IP
    RATE_LIMIT_AUTHENTICATED: int = 60   # per minute per user
    RATE_LIMIT_INTERVIEW: int = 10       # per minute per session

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# ── Plan Definitions ─────────────────────────────────

PLAN_CONFIG = {
    "free": {
        "max_turns": 6,
        "temperature": 0.4,
        "max_words": 28,
        "role_title": "Friendly Interview Coach",
        "opening_style": "simple, warm, confidence-building",
        "interviews_per_month": 2,
        "has_ideal_answers": False,
        "has_pdf_report": False,
        "has_rubric_breakdown": False,
        "has_session_history": False,
    },
    "pro": {
        "max_turns": 16,
        "temperature": 0.5,
        "max_words": 30,
        "role_title": "Senior Technical Interviewer",
        "opening_style": "strict but fair, technical, concise",
        "interviews_per_month": 15,
        "has_ideal_answers": True,
        "has_pdf_report": True,
        "has_rubric_breakdown": True,
        "has_session_history": True,
    },
    "career": {
        "max_turns": 20,
        "temperature": 0.55,
        "max_words": 35,
        "role_title": "Advanced Hiring Panel Interviewer",
        "opening_style": "sharp, adaptive, personalized, realistic",
        "interviews_per_month": 9999,
        "has_ideal_answers": True,
        "has_pdf_report": True,
        "has_rubric_breakdown": True,
        "has_session_history": True,
    },
}

VALID_PLANS = set(PLAN_CONFIG.keys())

CATEGORY_WEIGHTS = {
    "technical_depth": 0.30,
    "project_ownership": 0.20,
    "communication": 0.20,
    "problem_solving": 0.15,
    "behavioral": 0.15,
}


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
