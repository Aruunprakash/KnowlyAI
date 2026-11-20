import { ApiError } from './errors'
import { apiUrl, request } from './http'
import type { HealthReport, SourceDocument } from './types'

export function getHealth(signal?: AbortSignal): Promise<HealthReport> {
  return request<HealthReport>('/api/health', { signal, timeoutMs: 8_000 })
}

export function listDocuments(signal?: AbortSignal): Promise<SourceDocument[]> {
  return request<{ documents: SourceDocument[] }>('/api/documents', { signal }).then(
    (body) => body.documents,
  )
}

export function deleteDocument(id: string, signal?: AbortSignal): Promise<void> {
  return request<void>(`/api/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
  })
}

export function documentFileUrl(id: string, page?: number | null): string {
  const base = apiUrl(`/api/documents/${encodeURIComponent(id)}/file`)
  // The #page fragment is honoured by every built-in PDF viewer.
  return page ? `${base}#page=${page}` : base
}

export interface UploadHandle {
  /** Resolves with the ingested document once the backend finishes indexing. */
  result: Promise<SourceDocument>
  cancel: () => void
}

/**
 * Upload and ingest a PDF.
 *
 * Uses XMLHttpRequest rather than fetch: ingestion of a large PDF takes long
 * enough that a real progress bar matters, and `fetch` still cannot report
 * upload progress.
 */
export function uploadDocument(
  file: File,
  onProgress?: (fraction: number) => void,
): UploadHandle {
  const xhr = new XMLHttpRequest()

  const result = new Promise<SourceDocument>((resolve, reject) => {
    const form = new FormData()
    form.append('file', file, file.name)

    xhr.open('POST', apiUrl('/api/documents'), true)
    xhr.responseType = 'json'
    xhr.setRequestHeader('Accept', 'application/json')
    // Indexing is embedding-bound; give it room before giving up.
    xhr.timeout = 10 * 60 * 1000

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    })

    xhr.addEventListener('load', () => {
      const body: unknown = xhr.response
      if (xhr.status >= 200 && xhr.status < 300) {
        const document = (body as { document?: SourceDocument } | null)?.document
        if (!document) {
          reject(new ApiError('Upload succeeded but no document was returned.', { kind: 'parse' }))
          return
        }
        onProgress?.(1)
        resolve(document)
        return
      }
      const detail = (body as { detail?: unknown } | null)?.detail
      reject(
        new ApiError(
          typeof detail === 'string' && detail ? detail : `Upload failed (${xhr.status}).`,
          { kind: 'http', status: xhr.status },
        ),
      )
    })

    xhr.addEventListener('error', () =>
      reject(new ApiError('Upload could not reach the service.', { kind: 'network' })),
    )
    xhr.addEventListener('timeout', () =>
      reject(new ApiError('Upload timed out while the document was being indexed.', { kind: 'timeout' })),
    )
    xhr.addEventListener('abort', () =>
      reject(new ApiError('Upload cancelled.', { kind: 'aborted' })),
    )

    xhr.send(form)
  })

  return { result, cancel: () => xhr.abort() }
}
