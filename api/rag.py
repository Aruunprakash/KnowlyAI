"""Retrieval and generation, wrapped around the existing pipeline in src/.

The chunking, embedding model, vector store and LLM all come from src/ — this
module only adds what a web client needs and the CLI never did: cached handles,
per-document metadata, numbered excerpts, and token streaming.
"""

import logging
from functools import lru_cache
from typing import AsyncIterator, Iterable, Optional

from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate

from . import config
from .schemas import Citation, HistoryTurn

logger = logging.getLogger("knowly.rag")

# The citation contract. The UI turns every [n] into a clickable marker tied to
# excerpt n, so the numbering here and the order of `build_citations` must agree.
ANSWER_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are KnowlyAI, a document question-answering assistant.\n\n"
            "Answer using ONLY the numbered excerpts supplied with the question.\n"
            "Cite the excerpt behind every factual statement with its number in "
            "square brackets, like [1] or [2], placed at the end of the sentence "
            "it supports. Never cite a number that was not supplied.\n"
            "If the excerpts do not contain the answer, say plainly that the "
            "indexed documents do not cover it. Do not fall back on general "
            "knowledge, and do not speculate.\n"
            "Prefer short paragraphs and lists. Match the question's language.",
        ),
        ("placeholder", "{history}"),
        (
            "human",
            "Excerpts:\n{context}\n\nQuestion: {question}",
        ),
    ]
)


@lru_cache(maxsize=1)
def vector_store():
    """Cached handle.

    src.retrieval.get_vector_store() constructs an embedding client and opens
    the Chroma collection on every call; doing that per request adds hundreds
    of milliseconds to each question.

    The import is deferred so that starting the service — and serving
    /api/health — does not depend on the whole LangChain stack loading
    cleanly.
    """
    from src.retrieval import get_vector_store

    return get_vector_store()


@lru_cache(maxsize=1)
def llm():
    from src.generation import get_llm

    return get_llm()


def reset_caches() -> None:
    """Called after ingest/delete so the next read sees the new collection."""
    vector_store.cache_clear()


# -- Indexing ---------------------------------------------------------------


def ingest_pdf(path: str, document_id: str, display_name: str) -> tuple[int, int]:
    """Split a PDF and add it to the collection.

    Returns (pages, chunks). Every chunk is stamped with the document id so a
    later delete can remove exactly this document's vectors and nothing else.
    """
    from src.ingestion import load_pdf, split_documents

    pages = load_pdf(path)
    chunks = split_documents(pages)

    for chunk in chunks:
        chunk.metadata["document_id"] = document_id
        chunk.metadata["display_name"] = display_name

    if chunks:
        vector_store().add_documents(chunks)

    return len(pages), len(chunks)


def delete_document_vectors(document_id: str) -> None:
    store = vector_store()
    try:
        store.delete(where={"document_id": document_id})
    except Exception:
        logger.exception("Could not delete vectors for document %s", document_id)
        raise


def count_chunks() -> int:
    try:
        return vector_store()._collection.count()  # noqa: SLF001 - no public API for this
    except Exception:
        logger.debug("Chunk count unavailable", exc_info=True)
        return 0


# -- Retrieval --------------------------------------------------------------


def retrieve(
    question: str, top_k: int, document_ids: Optional[list[str]] = None
) -> list[tuple[Document, Optional[float]]]:
    store = vector_store()
    where = {"document_id": {"$in": document_ids}} if document_ids else None

    try:
        scored = store.similarity_search_with_relevance_scores(
            question, k=top_k, filter=where
        )
        return [(document, score) for document, score in scored]
    except Exception:
        # Not every Chroma/embedding combination can produce relevance scores;
        # an answer without a match percentage still beats no answer.
        logger.debug("Falling back to unscored search", exc_info=True)
        return [(document, None) for document in store.similarity_search(question, k=top_k, filter=where)]


def build_citations(results: Iterable[tuple[Document, Optional[float]]]) -> list[Citation]:
    citations: list[Citation] = []

    for index, (document, score) in enumerate(results, start=1):
        metadata = document.metadata or {}
        page = metadata.get("page")
        snippet = document.page_content.strip()

        citations.append(
            Citation(
                id=f"c{index}",
                index=index,
                documentId=metadata.get("document_id"),
                # PyPDFLoader records the original path; the display name is
                # only present on documents indexed through this API.
                source=metadata.get("display_name") or _basename(metadata.get("source")),
                # PyPDFLoader pages are 0-based; humans and PDF viewers are not.
                page=page + 1 if isinstance(page, int) else None,
                snippet=snippet[: config.SNIPPET_LIMIT],
                score=_clamp(score),
            )
        )

    return citations


def format_context(citations: Iterable[Citation]) -> str:
    return "\n\n".join(
        f"[{citation.index}] ({citation.source}"
        + (f", page {citation.page}" if citation.page else "")
        + f")\n{citation.snippet}"
        for citation in citations
    )


# -- Generation -------------------------------------------------------------


async def stream_answer(
    question: str, context: str, history: list[HistoryTurn]
) -> AsyncIterator[str]:
    chain = ANSWER_PROMPT | llm()

    payload = {
        "question": question,
        "context": context,
        "history": [(turn.role, turn.content) for turn in history],
    }

    async for chunk in chain.astream(payload):
        text = getattr(chunk, "content", "")
        if isinstance(text, list):
            # Some providers emit content as a list of parts.
            text = "".join(part.get("text", "") for part in text if isinstance(part, dict))
        if text:
            yield text


def _basename(source: Optional[str]) -> str:
    if not source:
        return "Unknown source"
    return source.replace("\\", "/").rsplit("/", 1)[-1]


def _clamp(score: Optional[float]) -> Optional[float]:
    if score is None:
        return None
    return max(0.0, min(1.0, float(score)))
