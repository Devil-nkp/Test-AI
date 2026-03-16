"""
PrepVista AI — Resume Parser Service
PDF extraction, sanitization, and structured parsing via LLM.
"""

import io
import re
import structlog
import PyPDF2
from fastapi import HTTPException

from app.config import get_settings
from app.services.llm import call_llm_json
from app.services.prompts import build_resume_extraction_prompt

logger = structlog.get_logger("prepvista.resume")

# ── Prompt injection patterns to strip ───────────────
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?previous\s+instructions",
    r"you\s+are\s+now",
    r"system\s*:",
    r"pretend\s+you",
    r"disregard\s+(all\s+)?prior",
    r"new\s+instructions",
    r"forget\s+(everything|all)",
    r"override\s+(your|all)",
]


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract raw text from PDF bytes. Raises HTTPException on failure."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            pages.append(text.strip())
        raw_text = "\n".join(p for p in pages if p).strip()
        if not raw_text:
            raise HTTPException(status_code=400, detail="Could not extract text from the resume PDF. Please ensure it's not an image-only scan.")
        return raw_text[:get_settings().MAX_RESUME_TEXT_LENGTH]
    except HTTPException:
        raise
    except Exception as e:
        logger.error("pdf_extraction_failed", error=str(e))
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {str(e)}")


def sanitize_resume_text(text: str) -> str:
    """Strip potential prompt injection patterns from resume text."""
    sanitized = text
    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[filtered]", sanitized, flags=re.IGNORECASE)
    return sanitized


def validate_pdf_upload(file_bytes: bytes, filename: str):
    """Validate the uploaded PDF file."""
    settings = get_settings()

    if len(file_bytes) > settings.MAX_RESUME_SIZE_BYTES:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {settings.MAX_RESUME_SIZE_BYTES // (1024*1024)}MB.")

    if not file_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be a valid PDF.")

    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invalid file extension. Must be a .pdf file.")


async def parse_resume_structured(resume_text: str) -> dict:
    """Extract structured resume data using LLM."""
    try:
        prompt = build_resume_extraction_prompt(resume_text)
        result = await call_llm_json(
            [{"role": "system", "content": prompt}],
            temperature=0.1,
        )
        # Validate minimum structure
        if not isinstance(result, dict):
            return _default_resume_summary(resume_text)
        return result
    except Exception as e:
        logger.warning("resume_extraction_failed", error=str(e))
        return _default_resume_summary(resume_text)


def _default_resume_summary(resume_text: str) -> dict:
    """Fallback resume summary when LLM extraction fails."""
    first_line = resume_text.splitlines()[0].strip() if resume_text.splitlines() else "Unknown"
    return {
        "candidate_name": first_line[:80],
        "education": [],
        "skills": [],
        "projects": [],
        "experience": [],
        "inferred_role": "other",
    }
