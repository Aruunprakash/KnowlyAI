import { useState } from 'react'
import { AlertTriangle, Check, Copy, RotateCcw } from 'lucide-react'
import type { Citation } from '@/lib/api'
import type { ChatMessage } from '@/hooks/useChat'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { ThinkingDots } from '@/components/ui/Spinner'
import { formatDuration, formatTime } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import { Markdown } from './Markdown'
import { SourceStrip } from './SourceStrip'

export interface MessageProps {
  message: ChatMessage
  activeCitationId: string | null
  onCitationSelect: (citation: Citation) => void
  onRetry: (messageId: string) => void
}

export function Message({ message, activeCitationId, onCitationSelect, onRetry }: MessageProps) {
  if (message.role === 'user') return <UserMessage message={message} />

  return (
    <AssistantMessage
      message={message}
      activeCitationId={activeCitationId}
      onCitationSelect={onCitationSelect}
      onRetry={onRetry}
    />
  )
}

function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <article className="flex justify-end" aria-label="Your question">
      <div className="max-w-[min(42rem,85%)]">
        <div
          className="border-2 border-border bg-accent px-3.5 py-2.5 text-[0.9375rem] leading-relaxed
                     font-semibold whitespace-pre-wrap text-accent-fg shadow-sm"
        >
          {message.content}
        </div>
        <time
          dateTime={message.createdAt}
          className="mt-1.5 block pr-1 text-right font-mono text-2xs text-text-subtle"
        >
          {formatTime(message.createdAt)}
        </time>
      </div>
    </article>
  )
}

function AssistantMessage({
  message,
  activeCitationId,
  onCitationSelect,
  onRetry,
}: MessageProps) {
  const [copied, setCopied] = useState(false)
  const waiting = message.status === 'pending' && !message.content

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* Clipboard access can be denied; the button simply does nothing. */
    }
  }

  return (
    <article className="group/message" aria-label="KnowlyAI answer">
      <header className="mb-2 flex items-center gap-2">
        <Mark />
        <span className="type-label text-2xs">KnowlyAI</span>

        {message.status === 'complete' && message.elapsedMs ? (
          <span className="font-mono text-2xs text-text-subtle tabular-nums">
            {formatDuration(message.elapsedMs)}
          </span>
        ) : null}

        {message.status === 'stopped' ? (
          <span className="text-2xs text-text-subtle">stopped</span>
        ) : null}

        {message.content && message.status !== 'pending' ? (
          <div
            className="ml-auto opacity-0 transition-opacity duration-150 focus-within:opacity-100
                       group-hover/message:opacity-100"
          >
            <IconButton
              label={copied ? 'Copied' : 'Copy answer'}
              size="sm"
              onClick={() => void copy()}
              icon={
                copied ? (
                  <Check className="size-3.5 text-success" />
                ) : (
                  <Copy className="size-3.5" />
                )
              }
            />
          </div>
        ) : null}
      </header>

      <div className="pl-[1.875rem]">
        {waiting ? (
          <p className="flex items-center gap-2 text-sm text-text-muted" role="status">
            <ThinkingDots />
            <span>Searching your documents…</span>
          </p>
        ) : null}

        {message.content ? (
          <Markdown
            citations={message.citations}
            onCitationClick={onCitationSelect}
            streaming={message.status === 'streaming' || message.status === 'pending'}
          >
            {message.content}
          </Markdown>
        ) : null}

        {message.error ? (
          <div
            role="alert"
            className={cn(
              'flex flex-col gap-2.5 border-2 border-danger bg-danger-subtle p-3',
              message.content && 'mt-3',
            )}
          >
            <p className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-text">
              <AlertTriangle className="mt-px size-4 shrink-0 text-danger" aria-hidden="true" />
              <span>{message.error.message}</span>
            </p>
            {message.error.retryable ? (
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                iconLeft={<RotateCcw className="size-3.5" />}
                onClick={() => onRetry(message.id)}
              >
                Try again
              </Button>
            ) : null}
          </div>
        ) : null}

        {message.status !== 'pending' || message.citations.length ? (
          <SourceStrip
            citations={message.citations}
            onSelect={onCitationSelect}
            activeId={activeCitationId}
          />
        ) : null}
      </div>
    </article>
  )
}

/** Small wordmark glyph: the plum slab with its amber bar, as in the sidebar. */
function Mark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-[1.375rem] shrink-0 items-center justify-center bg-text',
        className,
      )}
    >
      <span className="h-1 w-3 bg-accent" />
    </span>
  )
}
