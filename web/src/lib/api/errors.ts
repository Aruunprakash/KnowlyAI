export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'parse' | 'stream'

/** One error type for every failure mode, so the UI branches on `kind`, not strings. */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  readonly code: string | null

  constructor(
    message: string,
    options: { kind: ApiErrorKind; status?: number | null; code?: string | null; cause?: unknown },
  ) {
    super(message, { cause: options.cause })
    this.name = 'ApiError'
    this.kind = options.kind
    this.status = options.status ?? null
    this.code = options.code ?? null
  }

  /** Whether offering a retry button makes sense. */
  get retryable(): boolean {
    if (this.kind === 'aborted') return false
    if (this.kind === 'http') return this.status === null || this.status >= 500 || this.status === 429
    return true
  }

  /** Phrasing safe to show a user: no stack traces, no raw tracebacks. */
  get userMessage(): string {
    switch (this.kind) {
      case 'network':
        return 'Could not reach KnowlyAI. Try again in a moment.'
      case 'timeout':
        return 'The service took too long to respond.'
      case 'aborted':
        return 'Request stopped.'
      case 'parse':
        return 'The service returned a response this app could not read.'
      default:
        return this.message
    }
  }
}

export function isAbort(error: unknown): boolean {
  return (
    (error instanceof ApiError && error.kind === 'aborted') ||
    (error instanceof DOMException && error.name === 'AbortError')
  )
}

export function toApiError(error: unknown, fallback = 'Something went wrong.'): ApiError {
  if (error instanceof ApiError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError('Request stopped.', { kind: 'aborted', cause: error })
  }
  if (error instanceof TypeError) {
    return new ApiError('Network request failed.', { kind: 'network', cause: error })
  }
  return new ApiError(error instanceof Error ? error.message : fallback, {
    kind: 'http',
    cause: error,
  })
}
