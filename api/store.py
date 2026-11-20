"""The document manifest.

Chroma holds the vectors; this holds the file-level facts the UI needs (display
name, page count, size, when it was added) and the path to the original PDF so
a citation can be opened at its page. A JSON file is enough: the collection is
small, writes are rare, and it keeps the project free of another dependency.
"""

import json
import threading
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from . import config


@dataclass
class DocumentRecord:
    id: str
    name: str
    pages: int
    chunks: int
    size_bytes: int
    uploaded_at: str
    path: str
    status: str = "ready"
    error: Optional[str] = None


# Writes come from request handlers that may run on different threads.
_lock = threading.Lock()


def _read_raw() -> list[dict]:
    if not config.MANIFEST_PATH.exists():
        return []
    try:
        data = json.loads(config.MANIFEST_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        # A corrupt manifest must not take the service down; the vectors are
        # still in Chroma and re-uploading rebuilds the entry.
        return []
    return data if isinstance(data, list) else []


def _write_raw(records: list[dict]) -> None:
    config.ensure_directories()
    tmp = config.MANIFEST_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(records, indent=2), encoding="utf-8")
    tmp.replace(config.MANIFEST_PATH)  # Atomic, so a crash cannot truncate it.


def list_documents() -> list[DocumentRecord]:
    records = [DocumentRecord(**row) for row in _read_raw()]
    records.sort(key=lambda record: record.uploaded_at, reverse=True)
    return records


def get(document_id: str) -> Optional[DocumentRecord]:
    return next((record for record in list_documents() if record.id == document_id), None)


def add(record: DocumentRecord) -> DocumentRecord:
    with _lock:
        rows = [row for row in _read_raw() if row.get("id") != record.id]
        rows.append(asdict(record))
        _write_raw(rows)
    return record


def remove(document_id: str) -> Optional[DocumentRecord]:
    with _lock:
        rows = _read_raw()
        kept = [row for row in rows if row.get("id") != document_id]
        if len(kept) == len(rows):
            return None
        _write_raw(kept)
        removed = next(row for row in rows if row.get("id") == document_id)

    record = DocumentRecord(**removed)
    stored = Path(record.path)
    try:
        if stored.is_file():
            stored.unlink()
    except OSError:
        # The index entry is gone either way; a stray file is not worth a 500.
        pass
    return record


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")
