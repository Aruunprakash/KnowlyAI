import * as chat from './chat'
import * as documents from './documents'
import type { UploadHandle } from './documents'
import { createMockApi } from './mock'
import type { AnswerEvent, AskRequest, HealthReport, SourceDocument } from './types'

export type { UploadHandle } from './documents'

/** The whole backend surface this UI depends on. */
export interface KnowlyApi {
  getHealth(signal?: AbortSignal): Promise<HealthReport>
  listDocuments(signal?: AbortSignal): Promise<SourceDocument[]>
  deleteDocument(id: string, signal?: AbortSignal): Promise<void>
  documentFileUrl(id: string, page?: number | null): string
  uploadDocument(file: File, onProgress?: (fraction: number) => void): UploadHandle
  askQuestion(payload: AskRequest, signal: AbortSignal): AsyncGenerator<AnswerEvent>
}

const liveApi: KnowlyApi = {
  getHealth: documents.getHealth,
  listDocuments: documents.listDocuments,
  deleteDocument: documents.deleteDocument,
  documentFileUrl: documents.documentFileUrl,
  uploadDocument: documents.uploadDocument,
  askQuestion: chat.askQuestion,
}

export const USING_MOCK_API = import.meta.env.VITE_MOCK_API === 'true'

/** Components talk to this and never to the transport modules directly. */
export const api: KnowlyApi = USING_MOCK_API ? createMockApi() : liveApi

export * from './types'
export { ApiError, isAbort, toApiError } from './errors'
