import { ApiError } from './errors'

export interface ServerSentEvent {
  event: string
  data: string
}

/**
 * Parse a `text/event-stream` body incrementally.
 *
 * `EventSource` is not usable here: it cannot POST and cannot be aborted
 * cleanly, so the stream is read off `fetch` and framed by hand. Handles
 * \n and \r\n, multi-line `data:` fields, and comment/heartbeat lines.
 */
export async function* readEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ServerSentEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      let boundary = findBoundary(buffer)
      while (boundary) {
        const frame = buffer.slice(0, boundary.index)
        buffer = buffer.slice(boundary.index + boundary.length)
        const parsed = parseFrame(frame)
        if (parsed) yield parsed
        boundary = findBoundary(buffer)
      }
    }

    // A final frame with no trailing blank line still counts.
    const trailing = parseFrame(buffer + decoder.decode())
    if (trailing) yield trailing
  } finally {
    reader.releaseLock()
    // Cancelling is best-effort: the stream may already be closed.
    void body.cancel().catch(() => {})
  }
}

function findBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf('\n\n')
  const crlf = buffer.indexOf('\r\n\r\n')
  if (lf === -1 && crlf === -1) return null
  if (crlf !== -1 && (lf === -1 || crlf < lf)) return { index: crlf, length: 4 }
  return { index: lf, length: 2 }
}

function parseFrame(frame: string): ServerSentEvent | null {
  let event = 'message'
  const data: string[] = []

  for (const rawLine of frame.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line || line.startsWith(':')) continue

    const colon = line.indexOf(':')
    const field = colon === -1 ? line : line.slice(0, colon)
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '')

    if (field === 'event') event = value
    else if (field === 'data') data.push(value)
  }

  if (!data.length) return null
  return { event, data: data.join('\n') }
}

export function parseEventData<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch (cause) {
    throw new ApiError('Received a malformed stream event.', { kind: 'stream', cause })
  }
}
