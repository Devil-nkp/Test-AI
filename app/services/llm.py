"""
PrepVista AI — LLM Service
Abstraction over Groq (primary) and OpenAI (fallback) with automatic failover.
"""

import asyncio
import json
import structlog
from groq import AsyncGroq
from openai import AsyncOpenAI
from app.config import get_settings

logger = structlog.get_logger("prepvista.llm")

# ── Lazy-init clients ────────────────────────────────
_groq_client: AsyncGroq | None = None
_openai_client: AsyncOpenAI | None = None


def _get_groq() -> AsyncGroq:
    global _groq_client
    if not _groq_client:
        _groq_client = AsyncGroq(api_key=get_settings().GROQ_API_KEY)
    return _groq_client


def _get_openai() -> AsyncOpenAI:
    global _openai_client
    if not _openai_client:
        _openai_client = AsyncOpenAI(api_key=get_settings().OPENAI_API_KEY)
    return _openai_client


async def call_groq(
    messages: list[dict],
    temperature: float = 0.4,
    json_mode: bool = False,
    model: str | None = None,
    timeout: float = 15.0,
) -> str:
    """Call Groq API (primary provider)."""
    settings = get_settings()
    kwargs = {
        "model": model or settings.GROQ_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    client = _get_groq()
    response = await asyncio.wait_for(
        client.chat.completions.create(**kwargs),
        timeout=timeout,
    )
    return response.choices[0].message.content.strip()


async def call_openai(
    messages: list[dict],
    temperature: float = 0.4,
    json_mode: bool = False,
    model: str | None = None,
    timeout: float = 20.0,
) -> str:
    """Call OpenAI API (fallback provider)."""
    settings = get_settings()
    if not settings.OPENAI_API_KEY:
        raise RuntimeError("OpenAI API key not configured for fallback.")

    kwargs = {
        "model": model or settings.OPENAI_MODEL,
        "messages": messages,
        "temperature": temperature,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    client = _get_openai()
    response = await asyncio.wait_for(
        client.chat.completions.create(**kwargs),
        timeout=timeout,
    )
    return response.choices[0].message.content.strip()


async def call_llm(
    messages: list[dict],
    temperature: float = 0.4,
    json_mode: bool = False,
    model: str | None = None,
    retries: int = 2,
) -> str:
    """
    Call LLM with automatic Groq → OpenAI fallback.
    Retries on transient failures before falling back.
    """
    settings = get_settings()

    # Try Groq first
    for attempt in range(retries):
        try:
            result = await call_groq(messages, temperature, json_mode, model, settings.DEFAULT_LLM_TIMEOUT)
            return result
        except Exception as e:
            logger.warning("groq_call_failed", attempt=attempt + 1, error=str(e))
            if attempt < retries - 1:
                await asyncio.sleep(1.0)

    # Fallback to OpenAI
    if settings.OPENAI_API_KEY:
        try:
            logger.info("falling_back_to_openai")
            result = await call_openai(messages, temperature, json_mode, timeout=20.0)
            return result
        except Exception as e:
            logger.error("openai_fallback_failed", error=str(e))

    raise RuntimeError("All LLM providers failed. Please try again later.")


async def call_llm_json(
    messages: list[dict],
    temperature: float = 0.3,
    model: str | None = None,
) -> dict:
    """Call LLM and parse the response as JSON."""
    raw = await call_llm(messages, temperature, json_mode=True, model=model)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.error("llm_json_parse_error", raw_response=raw[:500])
        # Try to extract JSON from the response
        import re
        json_match = re.search(r'\{[\s\S]*\}', raw)
        if json_match:
            return json.loads(json_match.group())
        raise ValueError("LLM did not return valid JSON.")
