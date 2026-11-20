import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Ref } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { Kbd } from '@/components/ui/Badge'
import { cn } from '@/lib/utils/cn'
import { pluralize } from '@/lib/utils/format'

const MAX_ROWS_HEIGHT = 200
const MAX_LENGTH = 2000

export interface ComposerHandle {
  focus: () => void
}

export interface ComposerProps {
  onSend: (question: string) => void
  onStop: () => void
  isStreaming: boolean
  documentCount: number
  ref?: Ref<ComposerHandle>
}

export function Composer({
  onSend,
  onStop,
  isStreaming,
  documentCount,
  ref,
}: ComposerProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(ref, () => ({ focus: () => textareaRef.current?.focus() }), [])

  // Grow with the content up to a ceiling, then scroll inside.
  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(element.scrollHeight, MAX_ROWS_HEIGHT)}px`
  }, [value])

  const hasDocuments = documentCount > 0
  const canSend = value.trim().length > 0 && !isStreaming && hasDocuments

  const submit = useCallback(() => {
    if (!canSend) return
    onSend(value)
    setValue('')
  }, [canSend, onSend, value])

  return (
    <div className="px-4 pb-4 sm:px-6 sm:pb-5">
      <div className="mx-auto w-full max-w-3xl">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className={cn(
            'border-[3px] border-border bg-surface-raised shadow-md transition-shadow duration-100',
            'focus-within:shadow-[5px_5px_0_var(--accent)]',
          )}
        >
          <label htmlFor="composer" className="sr-only">
            Ask a question about your documents
          </label>
          <textarea
            id="composer"
            ref={textareaRef}
            rows={1}
            value={value}
            maxLength={MAX_LENGTH}
            disabled={!hasDocuments}
            spellCheck
            placeholder={
              hasDocuments
                ? 'Ask anything about your documents…'
                : 'Add a PDF to start asking questions'
            }
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends; Shift+Enter is a newline. IME composition must not
              // be interrupted, or CJK input commits half a word.
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submit()
              }
            }}
            className="scrollbar-slim block max-h-[12.5rem] w-full resize-none bg-transparent px-4 pt-3.5
                       pb-1 text-[1rem] leading-relaxed font-medium text-text outline-none
                       placeholder:text-text-subtle disabled:cursor-not-allowed"
          />

          <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
            <p className="min-w-0 truncate font-mono text-2xs text-text-subtle">
              {hasDocuments ? (
                <>
                  Searching {pluralize(documentCount, 'document')}
                  {/* Key hints are noise on a touch keyboard. */}
                  <span className="hidden sm:inline">
                    {' · '}
                    <Kbd>Enter</Kbd> to send, <Kbd>Shift</Kbd>
                    <Kbd className="ml-0.5">Enter</Kbd> for a new line
                  </span>
                </>
              ) : (
                'No documents indexed yet'
              )}
            </p>

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex size-9 shrink-0 items-center justify-center border-2
                           border-border bg-accent text-accent-fg transition-colors
                           hover:bg-accent-hover focus-visible:outline-3
                           focus-visible:outline-offset-2 focus-visible:outline-focus"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="size-3 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send question"
                className="inline-flex size-9 shrink-0 items-center justify-center border-2
                           border-border bg-text text-surface transition-[background-color,color]
                           duration-100 ease-standard hover:bg-accent hover:text-accent-fg
                           focus-visible:outline-3 focus-visible:outline-offset-2
                           focus-visible:outline-focus disabled:border-text-subtle
                           disabled:bg-surface-inset disabled:text-text-subtle"
              >
                <ArrowUp className="size-4" strokeWidth={2.4} />
              </button>
            )}
          </div>
        </form>

        {value.length > MAX_LENGTH - 200 ? (
          <p className="mt-1.5 text-right text-2xs text-text-subtle tabular-nums">
            {value.length} / {MAX_LENGTH}
          </p>
        ) : null}
      </div>
    </div>
  )
}
