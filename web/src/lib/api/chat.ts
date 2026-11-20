import { ApiError } from './errors'
import { apiUrl } from './http'
import { parseEventData, readEventStream } from './sse'
import type { AnswerEvent, AskRequest, Citation } from './types'

/**
 * Ask a question and yield events as the answer arrives.
 *
 * Citations land first — the backend retrieves before it generates — so the UI
 * can show sources while the prose is still streaming.
 */
export async function* askQuestion(
  payload: AskRequest,
  signal: AbortSignal,
): AsyncGenerator<AnswerEvent> {
  let response: Response
  try {
    response = await fetch(apiUrl('/api/chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal,
    })
  } catch (cause) {
    if (signal.aborted) throw new ApiError('Request stopped.', { kind: 'aborted', cause })
    throw new ApiError('Could not reach the KnowlyAI service.', { kind: 'network', cause })
  }

  if (!response.ok) {
    throw new ApiError(await readFailure(response), { kind: 'http', status: response.status })
  }

  if (!response.body) {
    throw new ApiError('The service returned an empty stream.', { kind: 'stream' })
  }

  for await (const frame of readEventStream(response.body)) {
    switch (frame.event) {
      case 'citations':
        yield {
          type: 'citations',
          citations: parseEventData<{ citations: Citation[] }>(frame.data).citations ?? [],
        }
        break
      case 'delta':
        yield { type: 'delta', text: parseEventData<{ text: string }>(frame.data).text ?? '' }
        break
      case 'done':
        yield { type: 'done', elapsedMs: parseEventData<{ elapsedMs: number }>(frame.data).elapsedMs ?? 0 }
        return
      case 'error': {
        const body = parseEventData<{ message?: string; code?: string }>(frame.data)
        yield {
          type: 'error',
          message: body.message ?? 'The service failed while answering.',
          code: body.code ?? null,
        }
        return
      }
      default:
        // Heartbeats and events added by a newer backend: ignore, don't crash.
        break
    }
  }
}

async function readFailure(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    const detail = (body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  } catch {
    /* fall through to the status line */
  }
  return `The service rejected the question (${response.status}).`
}
