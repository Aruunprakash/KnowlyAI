import { useCallback, useMemo, useRef, useState } from 'react'
import { api, isAbort, toApiError } from '@/lib/api'
import type { Citation } from '@/lib/api'
import { createId } from '@/lib/utils/id'

export type MessageRole = 'user' | 'assistant'
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'stopped' | 'error'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: MessageStatus
  citations: Citation[]
  error: { message: string; retryable: boolean } | null
  elapsedMs: number | null
}

/** How many prior turns are replayed to the backend for follow-up questions. */
const HISTORY_TURNS = 6

/**
 * Owns the transcript and the lifecycle of one in-flight answer.
 *
 * Streaming deltas are buffered and flushed on an animation frame: a fast model
 * emits tokens far quicker than React should re-render, and committing every
 * token separately makes long answers visibly stutter.
 */
export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const frameRef = useRef<number | null>(null)

  const patch = useCallback((id: string, changes: Partial<ChatMessage>) => {
    setMessages((current) =>
      current.map((message) => (message.id === id ? { ...message, ...changes } : message)),
    )
  }, [])

  const flush = useCallback(
    (id: string) => {
      if (frameRef.current !== null) return
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null
        const pending = bufferRef.current
        if (!pending) return
        bufferRef.current = ''
        setMessages((current) =>
          current.map((message) =>
            message.id === id
              ? { ...message, content: message.content + pending, status: 'streaming' }
              : message,
          ),
        )
      })
    },
    [],
  )

  const settle = useCallback(
    (id: string, changes: Partial<ChatMessage>) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
      const tail = bufferRef.current
      bufferRef.current = ''
      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, content: message.content + tail, ...changes } : message,
        ),
      )
    },
    [],
  )

  const run = useCallback(
    async (question: string, history: { role: MessageRole; content: string }[]) => {
      const controller = new AbortController()
      abortRef.current = controller

      const answerId = createId('msg')
      setMessages((current) => [
        ...current,
        {
          id: answerId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
          status: 'pending',
          citations: [],
          error: null,
          elapsedMs: null,
        },
      ])
      setIsStreaming(true)

      try {
        for await (const event of api.askQuestion({ question, history }, controller.signal)) {
          switch (event.type) {
            case 'citations':
              patch(answerId, { citations: event.citations })
              break
            case 'delta':
              bufferRef.current += event.text
              flush(answerId)
              break
            case 'done':
              settle(answerId, { status: 'complete', elapsedMs: event.elapsedMs })
              break
            case 'error':
              settle(answerId, {
                status: 'error',
                error: { message: event.message, retryable: true },
              })
              break
          }
        }
        // A stream that ends without `done` still has to leave a settled message.
        setMessages((current) =>
          current.map((message) =>
            message.id === answerId && (message.status === 'pending' || message.status === 'streaming')
              ? { ...message, status: message.content ? 'complete' : 'stopped' }
              : message,
          ),
        )
      } catch (error) {
        if (isAbort(error) || controller.signal.aborted) {
          settle(answerId, { status: 'stopped' })
        } else {
          const apiError = toApiError(error)
          settle(answerId, {
            status: 'error',
            error: { message: apiError.userMessage, retryable: apiError.retryable },
          })
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setIsStreaming(false)
      }
    },
    [flush, patch, settle],
  )

  const send = useCallback(
    (rawQuestion: string) => {
      const question = rawQuestion.trim()
      if (!question || abortRef.current) return

      const history = messages
        .filter((message) => message.status === 'complete' || message.role === 'user')
        .slice(-HISTORY_TURNS * 2)
        .map((message) => ({ role: message.role, content: message.content }))

      setMessages((current) => [
        ...current,
        {
          id: createId('msg'),
          role: 'user',
          content: question,
          createdAt: new Date().toISOString(),
          status: 'complete',
          citations: [],
          error: null,
          elapsedMs: null,
        },
      ])

      void run(question, history)
    },
    [messages, run],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  /** Drop the failed answer and ask the preceding question again. */
  const retry = useCallback(
    (messageId: string) => {
      if (abortRef.current) return

      const index = messages.findIndex((message) => message.id === messageId)
      if (index < 1) return
      const question = messages[index - 1]
      if (question?.role !== 'user') return

      const kept = messages.slice(0, index)
      setMessages(kept)

      const history = kept
        .slice(0, -1)
        .slice(-HISTORY_TURNS * 2)
        .map((message) => ({ role: message.role, content: message.content }))

      void run(question.content, history)
    },
    [messages, run],
  )

  const clear = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
  }, [])

  /** Every citation in the transcript, newest answer first, de-duplicated. */
  const allCitations = useMemo(() => {
    const seen = new Set<string>()
    const collected: Citation[] = []
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      for (const citation of messages[index]?.citations ?? []) {
        const key = `${citation.source}#${citation.page}`
        if (seen.has(key)) continue
        seen.add(key)
        collected.push(citation)
      }
    }
    return collected
  }, [messages])

  return { messages, isStreaming, send, stop, retry, clear, allCitations }
}
