"""
PrepVista AI — Evaluator Service
Per-question rubric evaluation + deterministic final score aggregation.
This is the core product differentiator.
"""

import json
import structlog
from collections import defaultdict

from app.config import CATEGORY_WEIGHTS
from app.services.llm import call_llm_json
from app.services.prompts import build_per_question_eval_prompt
from app.services.transcript import normalize_transcript

logger = structlog.get_logger("prepvista.evaluator")


async def evaluate_single_question(
    question_text: str,
    raw_answer: str,
    resume_summary: str,
    rubric_category: str,
    plan: str,
) -> dict:
    """
    Evaluate a single question-answer pair using the rubric system.
    Returns structured evaluation data.
    """
    normalized_answer = normalize_transcript(raw_answer)

    # Handle silent / empty answers
    if not normalized_answer or normalized_answer in ["[NO_ANSWER_TIMEOUT]", ""]:
        return {
            "classification": "silent",
            "score": 0,
            "scoring_rationale": "No answer provided.",
            "missing_elements": ["Candidate did not respond"],
            "ideal_answer": "",
            "communication_score": 0,
            "communication_notes": "No response.",
            "raw_answer": raw_answer,
            "normalized_answer": normalized_answer,
        }

    # Build and call evaluation prompt
    eval_prompt = build_per_question_eval_prompt(
        question=question_text,
        normalized_answer=normalized_answer,
        resume_summary=resume_summary,
        rubric_category=rubric_category,
        plan=plan,
    )

    try:
        result = await call_llm_json(
            [{"role": "system", "content": eval_prompt}],
            temperature=0.2,
        )

        # Validate and clamp scores
        score = max(0, min(10, float(result.get("score", 0))))
        comm_score = max(0, min(10, float(result.get("communication_score", 0))))

        return {
            "classification": result.get("classification", "vague"),
            "score": score,
            "scoring_rationale": result.get("scoring_rationale", ""),
            "missing_elements": result.get("missing_elements", []),
            "ideal_answer": result.get("ideal_answer", ""),
            "communication_score": comm_score,
            "communication_notes": result.get("communication_notes", ""),
            "raw_answer": raw_answer,
            "normalized_answer": normalized_answer,
        }

    except Exception as e:
        logger.error("question_evaluation_failed", error=str(e), question=question_text[:100])
        return {
            "classification": "vague",
            "score": 3,
            "scoring_rationale": "Evaluation could not be completed due to a processing error.",
            "missing_elements": [],
            "ideal_answer": "",
            "communication_score": 3,
            "communication_notes": "",
            "raw_answer": raw_answer,
            "normalized_answer": normalized_answer,
        }


def compute_final_score(question_evaluations: list[dict]) -> dict:
    """
    Deterministic final score aggregation from per-question evaluations.
    The LLM does NOT generate this score. This is computed by the backend.
    """
    if not question_evaluations:
        return {
            "final_score": 0,
            "category_scores": {},
            "total_questions": 0,
            "answered_questions": 0,
            "strongest_category": None,
            "weakest_category": None,
            "strengths": [],
            "weaknesses": [],
        }

    # Group scores by rubric category
    category_scores = defaultdict(list)
    comm_scores = []
    all_scores = []

    for q in question_evaluations:
        score = float(q.get("score", 0))
        category = q.get("rubric_category", "technical_depth")
        category_scores[category].append(score)
        all_scores.append(score)
        comm_scores.append(float(q.get("communication_score", 0)))

    # Compute category averages
    category_averages = {
        cat: round(sum(scores) / len(scores), 1)
        for cat, scores in category_scores.items()
    }

    # Add communication as a scored category
    if comm_scores:
        category_averages["communication"] = round(sum(comm_scores) / len(comm_scores), 1)

    # Weighted final score (0-100 scale)
    weighted_sum = 0
    total_weight = 0
    for cat, weight in CATEGORY_WEIGHTS.items():
        if cat in category_averages:
            weighted_sum += category_averages[cat] * weight
            total_weight += weight

    # If not all categories are covered, normalize by actual weight
    if total_weight > 0:
        final_score = round((weighted_sum / total_weight) * 10)
    else:
        final_score = round(sum(all_scores) / len(all_scores) * 10) if all_scores else 0

    final_score = max(0, min(100, final_score))

    # Derive strengths and weaknesses
    sorted_cats = sorted(category_averages.items(), key=lambda x: x[1], reverse=True)
    strengths = [f"Strong in {cat.replace('_', ' ')}" for cat, score in sorted_cats if score >= 7][:3]
    weaknesses = [f"Improve {cat.replace('_', ' ')}" for cat, score in sorted_cats if score < 5][:3]

    # Find strongest and weakest
    strongest = sorted_cats[0][0] if sorted_cats else None
    weakest = sorted_cats[-1][0] if sorted_cats else None

    answered = len([q for q in question_evaluations if q.get("classification") != "silent"])

    return {
        "final_score": final_score,
        "category_scores": category_averages,
        "total_questions": len(question_evaluations),
        "answered_questions": answered,
        "strongest_category": strongest,
        "weakest_category": weakest,
        "strengths": strengths,
        "weaknesses": weaknesses,
    }


def get_score_interpretation(score: int) -> str:
    """Human-readable interpretation of the final score."""
    if score >= 85:
        return "Excellent — You're well-prepared for real interviews."
    elif score >= 70:
        return "Good — You're close to interview-ready. Focus on your weak areas."
    elif score >= 55:
        return "Developing — You have some strengths, but need more practice in key areas."
    elif score >= 40:
        return "Needs Work — Significant improvement needed. Focus on fundamentals."
    else:
        return "Early Stage — Keep practicing. Review the ideal answers to understand what interviewers expect."
