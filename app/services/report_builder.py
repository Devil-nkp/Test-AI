"""
PrepVista AI — PDF Report Builder
Generates premium branded PDF reports using HTML + CSS → WeasyPrint.
Falls back to FPDF2 if WeasyPrint is not installed.
"""

import json
import io
import structlog
from datetime import datetime

logger = structlog.get_logger("prepvista.report_builder")


async def generate_pdf_report(session: dict, evaluations: list[dict], user_email: str) -> bytes:
    """Generate a branded PDF report from session data and evaluations."""

    score = float(session.get("final_score", 0))
    rubric_scores = json.loads(session.get("rubric_scores", "{}")) if session.get("rubric_scores") else {}
    strengths = session.get("strengths", [])
    weaknesses = session.get("weaknesses", [])
    created = session.get("created_at", "")

    # Build HTML report
    html = _build_report_html(
        score=score,
        rubric_scores=rubric_scores,
        strengths=strengths or [],
        weaknesses=weaknesses or [],
        evaluations=evaluations,
        email=user_email,
        date=str(created)[:10] if created else datetime.now().strftime("%Y-%m-%d"),
        plan=session.get("plan", "pro"),
    )

    # Try WeasyPrint first, fallback to FPDF2
    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=html).write_pdf()
        return pdf_bytes
    except ImportError:
        logger.warning("weasyprint_not_available_using_fpdf")
        return _fallback_fpdf(score, rubric_scores, strengths, weaknesses, evaluations, user_email)


def _build_report_html(
    score: float, rubric_scores: dict, strengths: list,
    weaknesses: list, evaluations: list, email: str, date: str, plan: str,
) -> str:
    """Build the full HTML template for the report."""

    # Score color
    if score >= 70:
        score_color = "#22c55e"
        score_bg = "#f0fdf4"
    elif score >= 50:
        score_color = "#eab308"
        score_bg = "#fefce8"
    else:
        score_color = "#ef4444"
        score_bg = "#fef2f2"

    # Build rubric bars
    rubric_html = ""
    for category, cat_score in rubric_scores.items():
        pct = min(100, float(cat_score) * 10)
        bar_color = "#22c55e" if pct >= 70 else "#eab308" if pct >= 50 else "#ef4444"
        rubric_html += f"""
        <div class="rubric-row">
            <span class="rubric-label">{category.replace('_', ' ').title()}</span>
            <div class="rubric-bar-bg">
                <div class="rubric-bar" style="width: {pct}%; background: {bar_color};"></div>
            </div>
            <span class="rubric-score">{cat_score}/10</span>
        </div>
        """

    # Build question breakdown
    questions_html = ""
    for i, ev in enumerate(evaluations, 1):
        cls = ev.get("classification", "vague")
        cls_color = {"strong": "#22c55e", "partial": "#eab308", "vague": "#f97316", "wrong": "#ef4444", "silent": "#94a3b8"}.get(cls, "#94a3b8")
        q_score = float(ev.get("score", 0))
        questions_html += f"""
        <div class="question-block">
            <div class="question-header">
                <span class="q-number">Q{i}</span>
                <span class="q-category">{(ev.get('rubric_category', '') or '').replace('_', ' ').title()}</span>
                <span class="q-badge" style="background: {cls_color};">{cls.upper()}</span>
                <span class="q-score">{q_score}/10</span>
            </div>
            <p class="q-question"><strong>Question:</strong> {ev.get('question_text', '')}</p>
            <p class="q-answer"><strong>Your Answer:</strong> {ev.get('normalized_answer', '') or ev.get('raw_answer', '') or 'No answer'}</p>
            <p class="q-rationale"><strong>Assessment:</strong> {ev.get('scoring_rationale', '')}</p>
            {"<p class='q-missing'><strong>Missing:</strong> " + ", ".join(ev.get('missing_elements', [])) + "</p>" if ev.get('missing_elements') else ""}
            {"<div class='q-ideal'><strong>💡 Ideal Answer:</strong> " + (ev.get('ideal_answer', '') or '') + "</div>" if ev.get('ideal_answer') else ""}
        </div>
        """

    # Build strengths/weaknesses
    strengths_html = "".join(f"<li>✅ {s}</li>" for s in (strengths or []))
    weaknesses_html = "".join(f"<li>⚠️ {w}</li>" for w in (weaknesses or []))

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; }}
        .header h1 {{ font-size: 28px; font-weight: 700; color: #2563eb; margin-bottom: 4px; }}
        .header p {{ color: #64748b; font-size: 14px; }}
        .score-card {{ text-align: center; background: {score_bg}; border-radius: 12px; padding: 32px; margin-bottom: 24px; }}
        .score-number {{ font-size: 64px; font-weight: 700; color: {score_color}; }}
        .score-label {{ font-size: 14px; color: #64748b; margin-top: 4px; }}
        .section {{ margin-bottom: 28px; }}
        .section h2 {{ font-size: 18px; font-weight: 600; color: #1e293b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }}
        .rubric-row {{ display: flex; align-items: center; margin-bottom: 10px; }}
        .rubric-label {{ width: 160px; font-size: 14px; font-weight: 500; }}
        .rubric-bar-bg {{ flex: 1; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin: 0 12px; }}
        .rubric-bar {{ height: 100%; border-radius: 6px; transition: width 0.3s; }}
        .rubric-score {{ font-size: 13px; font-weight: 600; width: 50px; text-align: right; }}
        ul {{ padding-left: 20px; }}
        li {{ margin-bottom: 6px; font-size: 14px; }}
        .question-block {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }}
        .question-header {{ display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }}
        .q-number {{ font-weight: 700; color: #2563eb; font-size: 14px; }}
        .q-category {{ font-size: 12px; color: #64748b; }}
        .q-badge {{ color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
        .q-score {{ font-weight: 600; font-size: 14px; margin-left: auto; }}
        .q-question, .q-answer, .q-rationale, .q-missing {{ font-size: 13px; margin-bottom: 6px; }}
        .q-answer {{ color: #475569; }}
        .q-ideal {{ background: #eff6ff; border-left: 3px solid #2563eb; padding: 10px; border-radius: 4px; font-size: 13px; margin-top: 8px; }}
        .footer {{ text-align: center; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>PrepVista AI</h1>
        <p>Interview Coaching Report — {date} — {plan.upper()} Plan</p>
    </div>

    <div class="score-card">
        <div class="score-number">{int(score)}</div>
        <div class="score-label">Overall Score out of 100</div>
    </div>

    <div class="section">
        <h2>Category Breakdown</h2>
        {rubric_html if rubric_html else "<p>No rubric data available.</p>"}
    </div>

    <div class="section">
        <h2>Key Strengths</h2>
        <ul>{strengths_html if strengths_html else "<li>Complete more interviews to see your strengths.</li>"}</ul>
    </div>

    <div class="section">
        <h2>Areas to Improve</h2>
        <ul>{weaknesses_html if weaknesses_html else "<li>Great job! Keep practicing to maintain your skills.</li>"}</ul>
    </div>

    <div class="section">
        <h2>Per-Question Breakdown</h2>
        {questions_html if questions_html else "<p>No question evaluations available.</p>"}
    </div>

    <div class="footer">
        <p>Generated by PrepVista AI — prepvista.ai</p>
        <p>Report for {email}</p>
    </div>
</body>
</html>"""


def _fallback_fpdf(score, rubric_scores, strengths, weaknesses, evaluations, email) -> bytes:
    """FPDF2 fallback when WeasyPrint is not available (e.g., no system deps)."""
    from fpdf import FPDF

    class PDF(FPDF):
        def header(self):
            self.set_font("Helvetica", "B", 18)
            self.set_text_color(37, 99, 235)
            self.cell(0, 12, "PrepVista AI — Interview Report", new_x="LMARGIN", new_y="NEXT", align="C")
            self.ln(8)

        def footer(self):
            self.set_y(-15)
            self.set_font("Helvetica", "", 8)
            self.set_text_color(148, 163, 184)
            self.cell(0, 10, f"PrepVista AI | {email}", align="C")

    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # Overall Score
    pdf.set_font("Helvetica", "B", 36)
    pdf.set_text_color(37, 99, 235)
    pdf.cell(0, 20, f"Score: {int(score)}/100", new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.ln(10)

    # Category scores
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 10, "Category Breakdown", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for cat, s in rubric_scores.items():
        pdf.cell(0, 8, f"  {cat.replace('_', ' ').title()}: {s}/10", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Strengths & Weaknesses
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Strengths", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for s in (strengths or ["Keep practicing!"]):
        pdf.cell(0, 7, f"  + {s}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Areas to Improve", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    for w in (weaknesses or ["Great job!"]):
        pdf.cell(0, 7, f"  - {w}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Per-question
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 10, "Per-Question Breakdown", new_x="LMARGIN", new_y="NEXT")
    for i, ev in enumerate(evaluations, 1):
        pdf.set_font("Helvetica", "B", 11)
        cls = (ev.get("classification", "vague") or "vague").upper()
        q_score = float(ev.get("score", 0))
        pdf.cell(0, 8, f"Q{i} [{cls}] — {q_score}/10 — {(ev.get('rubric_category', '') or '').replace('_', ' ').title()}",
                 new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 10)

        q_text = ev.get("question_text", "")[:200]
        pdf.multi_cell(0, 6, f"Question: {q_text}")

        answer = (ev.get("normalized_answer", "") or ev.get("raw_answer", "") or "No answer")[:300]
        pdf.multi_cell(0, 6, f"Answer: {answer}")

        if ev.get("ideal_answer"):
            pdf.set_font("Helvetica", "I", 10)
            pdf.multi_cell(0, 6, f"Ideal: {ev['ideal_answer'][:300]}")

        pdf.ln(4)

    return bytes(pdf.output())
