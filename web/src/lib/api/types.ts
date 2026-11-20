/**
 * The contract between this UI and the Python service in ../../api.
 * Keep both sides in step: these shapes mirror the Pydantic models there.
 */

export type DocumentStatus = 'processing' | 'ready' | 'failed'

export interface SourceDocument {
  id: string
  name: string
  pages: number
  chunks: number
  sizeBytes: number
  uploadedAt: string
  status: DocumentStatus
  error: string | null
}

export interface Citation {
  /** Stable within one answer; used as the React key and the anchor target. */
  id: string
  /** 1-based marker rendered beside the answer. */
  index: number
  documentId: string | null
  source: string
  page: number | null
  snippet: string
  /** Retrieval similarity, 0–1, when the backend can supply it. */
  score: number | null
}

export interface HealthReport {
  status: 'ok' | 'degraded'
  documents: number
  chunks: number
  chatModel: string
  embeddingModel: string
  /** Set when status is 'degraded' — e.g. a missing API key. */
  detail: string | null
}

/* -- Streaming answer events ---------------------------------------------- */

export interface CitationsEvent {
  type: 'citations'
  citations: Citation[]
}

export interface DeltaEvent {
  type: 'delta'
  text: string
}

export interface DoneEvent {
  type: 'done'
  elapsedMs: number
}

export interface ErrorEvent {
  type: 'error'
  message: string
  code: string | null
}

export type AnswerEvent = CitationsEvent | DeltaEvent | DoneEvent | ErrorEvent

export interface AskRequest {
  question: string
  /** Prior turns, oldest first, so the backend can resolve follow-ups. */
  history?: { role: 'user' | 'assistant'; content: string }[]
  documentIds?: string[]
  topK?: number
}
