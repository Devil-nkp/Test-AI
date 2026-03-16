"""
PrepVista AI — Database Connection Pool
Uses asyncpg for high-performance async PostgreSQL access.
"""

import asyncpg
import structlog
from app.config import get_settings

logger = structlog.get_logger("prepvista.db")

_pool: asyncpg.Pool | None = None


async def init_db_pool():
    """Initialize the connection pool on app startup."""
    global _pool
    settings = get_settings()
    _pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=2,
        max_size=10,
        command_timeout=30,
    )
    logger.info("db_pool_initialized", min_size=2, max_size=10)

    # Run schema migrations
    async with _pool.acquire() as conn:
        await _run_migrations(conn)


async def close_db_pool():
    """Close pool on app shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        logger.info("db_pool_closed")


async def get_db() -> asyncpg.Connection:
    """Get a connection from the pool."""
    if not _pool:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    return await _pool.acquire()


class DatabaseConnection:
    """Async context manager for database connections."""
    def __init__(self):
        self.conn = None

    async def __aenter__(self):
        self.conn = await _pool.acquire()
        return self.conn

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            await _pool.release(self.conn)


async def _run_migrations(conn: asyncpg.Connection):
    """Run schema creation. Idempotent — safe to run on every startup."""
    logger.info("running_migrations")
    await conn.execute(SCHEMA_SQL)
    logger.info("migrations_complete")


# ── Full Database Schema ─────────────────────────────
SCHEMA_SQL = """
-- ============================================================
-- PrepVista AI — Production Database Schema
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'career')),
    is_admin BOOLEAN DEFAULT FALSE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'none'
        CHECK (subscription_status IN ('none', 'active', 'past_due', 'canceled', 'trialing')),
    interviews_used_this_period INT DEFAULT 0,
    period_start TIMESTAMPTZ DEFAULT NOW(),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    prep_goal TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    resume_text TEXT NOT NULL,
    resume_summary JSONB,
    resume_file_path TEXT,
    question_plan JSONB,
    state TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (state IN ('ACTIVE', 'FINISHED', 'TERMINATED')),
    total_turns INT DEFAULT 0,
    silence_count INT DEFAULT 0,
    consecutive_followups INT DEFAULT 0,
    skip_topics TEXT[] DEFAULT '{}',
    final_score NUMERIC(5,2),
    rubric_scores JSONB,
    strengths TEXT[],
    weaknesses TEXT[],
    termination_reason TEXT,
    duration_planned_seconds INT,
    duration_actual_seconds INT,
    proctoring_mode TEXT DEFAULT 'practice',
    proctoring_violations JSONB DEFAULT '[]',
    access_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- Conversation messages (full transcript)
CREATE TABLE IF NOT EXISTS conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('system', 'assistant', 'user')),
    content TEXT NOT NULL,
    turn_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-question evaluations (the core product value)
CREATE TABLE IF NOT EXISTS question_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    turn_number INT NOT NULL,
    rubric_category TEXT NOT NULL,
    question_text TEXT NOT NULL,
    raw_answer TEXT,
    normalized_answer TEXT,
    classification TEXT CHECK (classification IN ('strong', 'partial', 'vague', 'wrong', 'silent')),
    score NUMERIC(3,1) NOT NULL DEFAULT 0,
    scoring_rationale TEXT,
    missing_elements TEXT[] DEFAULT '{}',
    ideal_answer TEXT,
    communication_score NUMERIC(3,1) DEFAULT 0,
    communication_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skill tracking across sessions
CREATE TABLE IF NOT EXISTS skill_scores (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    average_score NUMERIC(3,1) NOT NULL,
    question_count INT NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage events (audit trail)
CREATE TABLE IF NOT EXISTS usage_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    event_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billing events (Stripe webhook log)
CREATE TABLE IF NOT EXISTS billing_events (
    id BIGSERIAL PRIMARY KEY,
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID UNIQUE NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    report_data JSONB NOT NULL,
    pdf_file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_created ON interview_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session ON conversation_messages(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_evaluations_session ON question_evaluations(session_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_skills_user ON skill_scores(user_id, category, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_events(user_id, created_at DESC);
"""
