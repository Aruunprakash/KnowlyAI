import { ApiError } from './errors'

/**
 * Where the API lives. `?api=` in the page URL wins (the landing page and the
 * console accept the same override), then the build's VITE_API_BASE_URL, then
 * same origin. Same origin is right when FastAPI serves this build, or when the
 * Vite dev server proxies /api.
 */
function resolveBaseUrl(): string {
  try {
    const fromQuery = new URLSearchParams(window.location.search).get('api')
    if (fromQuery !== null) return fromQuery
  } catch {
    /* No usable location; fall through to the build setting. */
  }
  return import.meta.env.VITE_API_BASE_URL ?? ''
}

const BASE_URL = resolveBaseUrl().trim().replace(/\/+$/, '')

const DEFAULT_TIMEOUT_MS = 20_000

export function apiUrl(path: string): string {
  return `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

interface RequestOptions extends Omit<RequestInit, 'signal'> {
  signal?: AbortSignal | null
  timeoutMs?: number | null
}

/**
 * Fetch with a timeout, uniform error mapping, and FastAPI's `detail` field
 * surfaced as the message. Returns the parsed body.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { signal, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...init } = options

  const controller = new AbortController()
  const abortFromCaller = () => controller.abort(signal?.reason)
  signal?.addEventListener('abort', abortFromCaller, { once: true })

  let timedOut = false
  const timer =
    timeoutMs === null
      ? null
      : setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeoutMs)

  let response: Response
  try {
    response = await fetch(apiUrl(path), {
      ...init,
      headers: { Accept: 'application/json', ...headers },
      signal: controller.signal,
    })
  } catch (cause) {
    if (timedOut) {
      throw new ApiError(`Request to ${path} timed out.`, { kind: 'timeout', cause })
    }
    if (signal?.aborted) {
      throw new ApiError('Request stopped.', { kind: 'aborted', cause })
    }
    throw new ApiError('Network request failed.', { kind: 'network', cause })
  } finally {
    if (timer) clearTimeout(timer)
    signal?.removeEventListener('abort', abortFromCaller)
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), {
      kind: 'http',
      status: response.status,
    })
  }

  if (response.status === 204) return undefined as T

  try {
    return (await response.json()) as T
  } catch (cause) {
    throw new ApiError('Malformed response body.', { kind: 'parse', cause })
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  const generic = `Request failed (${response.status} ${response.statusText || 'error'}).`
  try {
    const body: unknown = await response.json()
    if (typeof body === 'string' && body.trim()) return body
    if (body && typeof body === 'object') {
      const detail = (body as { detail?: unknown; message?: unknown }).detail ??
        (body as { message?: unknown }).message
      if (typeof detail === 'string' && detail.trim()) return detail
      // FastAPI validation errors arrive as a list of issue objects.
      if (Array.isArray(detail)) {
        const first = detail[0] as { msg?: unknown } | undefined
        if (first && typeof first.msg === 'string') return first.msg
      }
    }
  } catch {
    /* Body was empty or not JSON; the status line is all we have. */
  }
  return generic
}
