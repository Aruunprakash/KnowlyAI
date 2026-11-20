import { ArrowRight, FileUp, Quote, Search } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { documentLabel } from '@/lib/utils/format'
import type { SourceDocument } from '@/lib/api'

const STARTERS = [
  'Summarise the key arguments in two paragraphs.',
  'What definitions does this document give, and on which pages?',
  'List the limitations the authors acknowledge.',
  'Which claims are supported by data rather than assertion?',
]

export interface WelcomeProps {
  documents: SourceDocument[]
  onPick: (question: string) => void
  onAddDocument: () => void
}

export function Welcome({ documents, onPick, onAddDocument }: WelcomeProps) {
  const ready = documents.filter((document) => document.status === 'ready')

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col justify-center px-1 py-10 sm:py-16">
      <h1 className="type-display text-balance text-[2.6rem] sm:text-[3.6rem]">
        Ask your documents a <span className="bg-accent px-[0.06em] text-accent-fg">question.</span>
      </h1>
      <p className="mt-4 max-w-prose text-[0.9375rem] leading-relaxed font-medium text-text-muted">
        KnowlyAI retrieves the passages that actually address your question and answers from those
        alone. Every claim carries the file and page it came from, so you can check it.
      </p>

      {ready.length === 0 ? (
        <button
          type="button"
          onClick={onAddDocument}
          className="mt-8 flex items-center gap-3.5 border-[3px] border-dashed border-border
                     bg-surface-raised px-4 py-4 text-left transition-colors hover:border-solid
                     hover:bg-accent hover:text-accent-fg focus-visible:outline-3
                     focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <span className="flex size-10 shrink-0 items-center justify-center border-2 border-border
                           bg-text text-accent">
            <FileUp className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-black uppercase [font-stretch:112%]">
              Add your first PDF
            </span>
            <span className="block text-[0.8125rem] font-medium">
              It is split, embedded, and indexed locally before anything is asked of it.
            </span>
          </span>
          <ArrowRight className="ml-auto size-5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
        </button>
      ) : (
        <>
          <h2 className="type-label mt-9 mb-3 text-2xs text-text-subtle">
            Try asking
          </h2>
          <ul className="flex flex-col gap-2.5">
            {STARTERS.map((starter) => (
              <li key={starter}>
                <button
                  type="button"
                  onClick={() => onPick(starter)}
                  className="group flex w-full items-center gap-3 border-2 border-border
                             bg-surface-raised px-3.5 py-3 text-left text-[0.9rem] font-semibold
                             text-text shadow-sm transition-[background-color,transform,box-shadow]
                             duration-100 hover:bg-accent hover:text-accent-fg
                             active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                             focus-visible:outline-3 focus-visible:outline-offset-2
                             focus-visible:outline-focus"
                >
                  <Search className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" />
                  <span className="min-w-0">{starter}</span>
                  <ArrowRight
                    className="ml-auto size-3.5 shrink-0 -translate-x-1 text-text-subtle opacity-0
                               transition-all duration-150 group-hover:translate-x-0
                               group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-6 flex items-start gap-2 text-[0.8125rem] leading-relaxed text-text-subtle">
            <Quote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Answers are limited to{' '}
              {ready
                .slice(0, 2)
                .map((document) => documentLabel(document.name))
                .join(', ')}
              {ready.length > 2 ? ` and ${ready.length - 2} more` : ''}. If the text does not cover
              your question, KnowlyAI says so rather than guessing.
            </span>
          </p>
        </>
      )}
    </div>
  )
}

export function SectionLabel({ children, className }: { children: string; className?: string }) {
  return (
    <h2
      className={cn(
        'type-label text-2xs text-text-subtle',
        className,
      )}
    >
      {children}
    </h2>
  )
}
