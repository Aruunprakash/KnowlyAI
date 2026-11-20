"""HTTP surface for KnowlyAI.

Run it with:

    uvicorn api.main:app --reload

The pipeline itself lives in src/ and is untouched by this layer: everything
here is transport, storage of uploaded files, and the server-sent-event stream
the web UI consumes.
"""

import asyncio
import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator

import anyio
from fastapi import FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import config, rag, store
from .schemas import (
    AskRequest,
    DocumentCreated,
    DocumentList,
    HealthReport,
    SourceDocument,
)

logging.basicConfig(level=os.getenv("KNOWLY_LOG_LEVEL", "INFO"))
logger = logging.getLogger("knowly.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    config.ensure_directories()
    yield


app = FastAPI(
    title="KnowlyAI",
    version="1.0.0",
    description="Document question answering with grounded citations.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


def _to_schema(record: store.DocumentRecord) -> SourceDocument:
    return SourceDocument(
        id=record.id,
        name=record.name,
        pages=record.pages,
        chunks=record.chunks,
        sizeBytes=record.size_bytes,
        uploadedAt=record.uploaded_at,
        status=record.status,
        error=record.error,
    )


# -- Health -----------------------------------------------------------------


@app.get("/api/health", response_model=HealthReport)
async def health() -> HealthReport:
    documents = store.list_documents()

    if not os.getenv("GOOGLE_API_KEY"):
        return HealthReport(
            status="degraded",
            documents=len(documents),
            chunks=sum(document.chunks for document in documents),
            chatModel="unavailable",
            embeddingModel="unavailable",
            detail="GOOGLE_API_KEY is not set",
        )

    chunks = await anyio.to_thread.run_sync(rag.count_chunks)

    return HealthReport(
        status="ok",
        documents=len(documents),
        chunks=chunks or sum(document.chunks for document in documents),
        chatModel=getattr(rag.llm(), "model", "gemini"),
        embeddingModel="models/gemini-embedding-001",
    )


# -- Documents --------------------------------------------------------------


@app.get("/api/documents", response_model=DocumentList)
async def list_documents() -> DocumentList:
    return DocumentList(documents=[_to_schema(record) for record in store.list_documents()])


@app.post("/api/documents", response_model=DocumentCreated, status_code=201)
async def upload_document(file: UploadFile) -> DocumentCreated:
    name = (file.filename or "").strip()
    if not name.lower().endswith(".pdf"):
        raise HTTPException(status_code=415, detail="Only PDF files can be indexed.")

    config.ensure_directories()
    document_id = f"doc_{uuid.uuid4().hex[:12]}"
    target = config.UPLOAD_DIR / f"{document_id}.pdf"

    size = 0
    try:
        with target.open("wb") as handle:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > config.MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail=f"File exceeds the {config.MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit.",
                    )
                handle.write(chunk)
    except HTTPException:
        target.unlink(missing_ok=True)
        raise
    except OSError as error:
        target.unlink(missing_ok=True)
        logger.exception("Could not write upload %s", name)
        raise HTTPException(status_code=500, detail="Could not store the upload.") from error

    if size == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="That file is empty.")

    # Parsing and embedding are CPU- and network-bound and fully synchronous;
    # off the event loop they go, or the whole service stalls during an upload.
    try:
        pages, chunks = await anyio.to_thread.run_sync(
            rag.ingest_pdf, str(target), document_id, name
        )
    except Exception as error:
        target.unlink(missing_ok=True)
        logger.exception("Indexing failed for %s", name)
        raise HTTPException(
            status_code=502,
            detail="The document could not be indexed. Check the API key and the file.",
        ) from error

    if chunks == 0:
        target.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail="No readable text was found. Scanned PDFs need OCR before indexing.",
        )

    record = store.add(
        store.DocumentRecord(
            id=document_id,
            name=name,
            pages=pages,
            chunks=chunks,
            size_bytes=size,
            uploaded_at=store.now_iso(),
            path=str(target),
        )
    )

    logger.info("Indexed %s: %d pages, %d chunks", name, pages, chunks)
    return DocumentCreated(document=_to_schema(record))


@app.delete("/api/documents/{document_id}", status_code=204)
async def delete_document(document_id: str) -> None:
    if store.get(document_id) is None:
        raise HTTPException(status_code=404, detail="No such document.")

    try:
        await anyio.to_thread.run_sync(rag.delete_document_vectors, document_id)
    except Exception as error:
        raise HTTPException(
            status_code=502, detail="Could not remove the document from the index."
        ) from error

    store.remove(document_id)


@app.get("/api/documents/{document_id}/file")
async def document_file(document_id: str) -> FileResponse:
    record = store.get(document_id)
    if record is None:
        raise HTTPException(status_code=404, detail="No such document.")

    path = anyio.Path(record.path)
    if not await path.is_file():
        raise HTTPException(status_code=410, detail="The stored file is no longer available.")

    return FileResponse(
        record.path,
        media_type="application/pdf",
        # inline so the browser's PDF viewer honours the #page fragment.
        headers={"Content-Disposition": f'inline; filename="{record.name}"'},
    )


# -- Chat -------------------------------------------------------------------


def _event(name: str, payload: dict) -> str:
    return f"event: {name}\ndata: {json.dumps(payload, ensure_ascii=False)}\n\n"


@app.post("/api/chat")
async def chat(payload: AskRequest, request: Request) -> StreamingResponse:
    if not store.list_documents():
        raise HTTPException(
            status_code=409, detail="No documents are indexed yet. Add a PDF first."
        )

    async def stream() -> AsyncIterator[str]:
        started = time.perf_counter()
        try:
            results = await anyio.to_thread.run_sync(
                rag.retrieve,
                payload.question,
                payload.topK or config.TOP_K,
                payload.documentIds or None,
            )

            citations = rag.build_citations(results)
            if not citations:
                yield _event(
                    "error",
                    {
                        "message": "Nothing in the indexed documents matched that question.",
                        "code": "no_match",
                    },
                )
                return

            yield _event(
                "citations", {"citations": [citation.model_dump() for citation in citations]}
            )

            context = rag.format_context(citations)
            async for delta in rag.stream_answer(payload.question, context, payload.history):
                if await request.is_disconnected():
                    logger.info("Client disconnected mid-answer; stopping generation.")
                    return
                yield _event("delta", {"text": delta})

            yield _event("done", {"elapsedMs": (time.perf_counter() - started) * 1000})

        except asyncio.CancelledError:
            raise
        except Exception as error:
            logger.exception("Answering failed")
            yield _event(
                "error",
                {"message": f"The service failed while answering: {error}", "code": "generation"},
            )

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            # Stops nginx and friends from buffering the stream into one blob.
            "X-Accel-Buffering": "no",
        },
    )


# -- Static frontend --------------------------------------------------------

# Present only after `npm run build`; in development Vite serves the UI and
# proxies /api here instead.
if config.WEB_DIST_DIR.is_dir():
    app.mount("/", StaticFiles(directory=config.WEB_DIST_DIR, html=True), name="web")
