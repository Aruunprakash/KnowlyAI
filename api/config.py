"""Runtime configuration for the KnowlyAI HTTP service.

Everything is overridable by environment variable so the same code runs from a
checkout, a container, or a developer's machine without edits.
"""

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def _path(env_var: str, default: str) -> Path:
    return Path(os.getenv(env_var, PROJECT_ROOT / default)).resolve()


# Where uploaded PDFs and the document manifest live.
STORAGE_DIR = _path("KNOWLY_STORAGE_DIR", "storage")
UPLOAD_DIR = STORAGE_DIR / "uploads"
MANIFEST_PATH = STORAGE_DIR / "documents.json"

# Must match src/retrieval.py, which is the CLI's view of the same index.
CHROMA_DIR = _path("KNOWLY_CHROMA_DIR", "chroma_db")
COLLECTION_NAME = os.getenv("KNOWLY_COLLECTION", "knowlyai_documents")

# Number of chunks retrieved per question.
TOP_K = int(os.getenv("KNOWLY_TOP_K", "4"))

MAX_UPLOAD_BYTES = int(os.getenv("KNOWLY_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))

# Characters of a chunk shown in the citation panel.
SNIPPET_LIMIT = int(os.getenv("KNOWLY_SNIPPET_LIMIT", "1200"))

# Comma-separated origins allowed to call the API directly. The Vite dev server
# proxies /api instead; the scroll landing page (scrollcraft/builds/...) is a
# static site on port 4512 and calls the API cross-origin, so it is listed.
DEFAULT_CORS_ORIGINS = ",".join(
    [
        "http://localhost:5173",
        "http://localhost:4512",
        "http://127.0.0.1:4512",
    ]
)
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("KNOWLY_CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
    if origin.strip()
]

# Optional: a built frontend to serve from this same process.
WEB_DIST_DIR = _path("KNOWLY_WEB_DIST", "web/dist")


def ensure_directories() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
