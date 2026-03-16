"""
PrepVista AI — Transcript Normalization Service
Corrects common speech-to-text artifacts before evaluation.
"""

import re


# ── Correction Dictionary ────────────────────────────
# Keys are lowercased STT artifacts, values are correct forms.
# This dictionary grows over time from real user transcripts.
NORMALIZATION_RULES = {
    # AI/ML terms
    "llmp3": "LLaMA 3",
    "llama three": "LLaMA 3",
    "llama 3": "LLaMA 3",
    "group": "Groq",
    "grow q": "Groq",
    "grow queue": "Groq",
    "pie torch": "PyTorch",
    "pie touch": "PyTorch",
    "tensor flow": "TensorFlow",
    "tensor float": "TensorFlow",
    "open ai": "OpenAI",
    "open a i": "OpenAI",
    "chat gpt": "ChatGPT",
    "chatgpt": "ChatGPT",
    "gpt for": "GPT-4",
    "gpt for oh": "GPT-4o",
    "hugging face": "HuggingFace",
    "lang chain": "LangChain",

    # Databases
    "my sequel": "MySQL",
    "my sql": "MySQL",
    "post gress": "PostgreSQL",
    "post gres": "PostgreSQL",
    "post gray sql": "PostgreSQL",
    "mongo db": "MongoDB",
    "redis": "Redis",
    "red is": "Redis",
    "sequel lite": "SQLite",

    # DevOps / Infrastructure
    "cube brunettes": "Kubernetes",
    "kubernetes": "Kubernetes",
    "docker eyes": "Dockerize",
    "docker ice": "Dockerize",
    "see eye see dee": "CI/CD",
    "cicd": "CI/CD",
    "ci cd": "CI/CD",
    "aws": "AWS",
    "eight of us": "AWS",
    "a double u s": "AWS",
    "azure": "Azure",
    "as your": "Azure",
    "gcp": "GCP",

    # Languages & Frameworks
    "java script": "JavaScript",
    "type script": "TypeScript",
    "react js": "React.js",
    "next js": "Next.js",
    "node js": "Node.js",
    "fast api": "FastAPI",
    "fast a p i": "FastAPI",
    "flask": "Flask",
    "jango": "Django",
    "dee jango": "Django",
    "python": "Python",
    "pie thon": "Python",

    # General tech
    "api": "API",
    "a p i": "API",
    "rest api": "REST API",
    "http": "HTTP",
    "html": "HTML",
    "css": "CSS",
    "json": "JSON",
    "jay son": "JSON",
    "sql": "SQL",
    "sequel": "SQL",
    "github": "GitHub",
    "git hub": "GitHub",
    "git": "Git",
}


def normalize_transcript(raw_text: str) -> str:
    """
    Apply STT correction rules to raw transcript text.
    Preserves original casing where possible, only corrects known artifacts.
    """
    if not raw_text:
        return raw_text

    normalized = raw_text

    # Sort rules by length (longest first) to avoid partial replacements
    sorted_rules = sorted(NORMALIZATION_RULES.items(), key=lambda x: len(x[0]), reverse=True)

    for pattern, replacement in sorted_rules:
        # Word-boundary aware replacement to avoid replacing substrings
        regex = re.compile(r'\b' + re.escape(pattern) + r'\b', re.IGNORECASE)
        normalized = regex.sub(replacement, normalized)

    return normalized.strip()


def clean_for_display(text: str) -> str:
    """Clean text for display in transcript/report (remove system markers)."""
    markers = [
        "[NO_ANSWER_TIMEOUT]",
        "[SYSTEM_DURATION_EXPIRED]",
        "[USER_REQUESTED_END]",
    ]
    result = text
    for marker in markers:
        result = result.replace(marker, "")
    return result.strip()
