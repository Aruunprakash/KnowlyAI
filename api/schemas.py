"""Response models.

Field names are camelCase because they are consumed by TypeScript; the mirror
of this file is web/src/lib/api/types.ts. Keep the two in step.
"""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class SourceDocument(BaseModel):
    id: str
    name: str
    pages: int
    chunks: int
    sizeBytes: int
    uploadedAt: str
    status: Literal["processing", "ready", "failed"] = "ready"
    error: Optional[str] = None


class DocumentList(BaseModel):
    documents: list[SourceDocument]


class DocumentCreated(BaseModel):
    document: SourceDocument


class Citation(BaseModel):
    id: str
    index: int
    documentId: Optional[str] = None
    source: str
    page: Optional[int] = None
    snippet: str
    score: Optional[float] = None


class HealthReport(BaseModel):
    status: Literal["ok", "degraded"]
    documents: int
    chunks: int
    chatModel: str
    embeddingModel: str
    detail: Optional[str] = None


class HistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    history: list[HistoryTurn] = Field(default_factory=list, max_length=20)
    documentIds: list[str] = Field(default_factory=list)
    topK: Optional[int] = Field(default=None, ge=1, le=12)
