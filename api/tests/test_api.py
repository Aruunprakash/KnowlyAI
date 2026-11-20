"""Contract tests for the HTTP layer.

Retrieval and generation are replaced with stubs: these assert the shapes the
web client depends on — status codes, JSON field names, and the ordering and
framing of the SSE stream — without needing an API key, a vector store, or a
network call.

Run with:  pytest api/tests
"""

import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("KNOWLY_STORAGE_DIR", str(tmp_path / "storage"))
    monkeypatch.setenv("KNOWLY_CHROMA_DIR", str(tmp_path / "chroma"))
    monkeypatch.setenv("KNOWLY_WEB_DIST", str(tmp_path / "no-dist"))
    monkeypatch.setenv("GOOGLE_API_KEY", "test-key")

    for module in [name for name in list(sys.modules) if name.startswith("api")]:
        del sys.modules[module]

    from api import main, rag
    from api.schemas import Citation

    monkeypatch.setattr(rag, "ingest_pdf", lambda path, doc_id, name: (3, 7))
    monkeypatch.setattr(rag, "delete_document_vectors", lambda doc_id: None)
    monkeypatch.setattr(rag, "count_chunks", lambda: 7)
    monkeypatch.setattr(rag, "llm", lambda: type("Fake", (), {"model": "gemini-test"})())
    monkeypatch.setattr(
        rag,
        "retrieve",
        lambda question, top_k, document_ids=None: [("doc", 0.8)],
    )
    monkeypatch.setattr(
        rag,
        "build_citations",
        lambda results: [
            Citation(
                id="c1",
                index=1,
                documentId="doc_1",
                source="machine_learning.pdf",
                page=7,
                snippet="Generalisation is the goal.",
                score=0.8,
            )
        ],
    )

    async def fake_stream(question, context, history):
        for token in ["Machine ", "learning ", "generalises [1]."]:
            yield token

    monkeypatch.setattr(rag, "stream_answer", fake_stream)

    with TestClient(main.app) as test_client:
        yield test_client


def upload(client, name="paper.pdf", body=b"%PDF-1.4 fake"):
    return client.post("/api/documents", files={"file": (name, body, "application/pdf")})


def test_health_reports_degraded_without_a_key(client, monkeypatch):
    monkeypatch.delenv("GOOGLE_API_KEY")
    body = client.get("/api/health").json()
    assert body["status"] == "degraded"
    assert body["detail"] == "GOOGLE_API_KEY is not set"


def test_library_starts_empty(client):
    assert client.get("/api/documents").json() == {"documents": []}


def test_upload_indexes_and_lists_a_pdf(client):
    response = upload(client)
    assert response.status_code == 201

    document = response.json()["document"]
    assert document["name"] == "paper.pdf"
    assert document["pages"] == 3
    assert document["chunks"] == 7
    assert document["status"] == "ready"

    listed = client.get("/api/documents").json()["documents"]
    assert [item["id"] for item in listed] == [document["id"]]


def test_upload_rejects_non_pdf_and_empty_files(client):
    assert upload(client, name="notes.txt").status_code == 415
    assert upload(client, body=b"").status_code == 400


def test_delete_removes_the_document(client):
    document_id = upload(client).json()["document"]["id"]
    assert client.delete(f"/api/documents/{document_id}").status_code == 204
    assert client.get("/api/documents").json() == {"documents": []}
    assert client.delete(f"/api/documents/{document_id}").status_code == 404


def test_document_file_is_served_inline(client):
    document_id = upload(client).json()["document"]["id"]
    response = client.get(f"/api/documents/{document_id}/file")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"].startswith("inline")


def test_chat_requires_an_indexed_document(client):
    assert client.post("/api/chat", json={"question": "anything?"}).status_code == 409


def test_chat_streams_citations_then_deltas_then_done(client):
    upload(client)
    response = client.post("/api/chat", json={"question": "What is the objective?"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = parse_sse(response.text)
    names = [name for name, _ in events]

    # Citations must arrive before any prose: the UI shows sources while the
    # answer is still being written.
    assert names[0] == "citations"
    assert names[-1] == "done"
    assert names.count("delta") == 3

    citations = events[0][1]["citations"]
    assert citations[0]["index"] == 1
    assert citations[0]["page"] == 7

    answer = "".join(payload["text"] for name, payload in events if name == "delta")
    assert answer == "Machine learning generalises [1]."


def test_chat_rejects_an_empty_question(client):
    upload(client)
    assert client.post("/api/chat", json={"question": ""}).status_code == 422


def parse_sse(raw: str) -> list[tuple[str, dict]]:
    events = []
    for frame in raw.strip().split("\n\n"):
        name, data = "message", []
        for line in frame.splitlines():
            if line.startswith("event:"):
                name = line[6:].strip()
            elif line.startswith("data:"):
                data.append(line[5:].lstrip())
        if data:
            events.append((name, json.loads("\n".join(data))))
    return events
