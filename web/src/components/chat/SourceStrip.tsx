import { FileText } from 'lucide-react'
import type { Citation } from '@/lib/api'
import { documentLabel } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'

export interface SourceStripProps {
  citations: Citation[]
  onSelect: (citation: Citation) => void
  activeId?: string | null
}

/**
 * The passages an answer was built from, listed beneath it. Shown as soon as
 * retrieval finishes, which is before the prose arrives — so the reader can see
 * what the answer will be grounded in while it is still being written.
 */
export function SourceStrip({ citations, onSelect, activeId }: SourceStripProps) {
  if (!citations.length) return null

  return (
    <section className="mt-4" aria-label="Sources for this answer">
      <h3 className="type-label mb-2.5 text-2xs text-text-subtle">
        Grounded in
      </h3>
      <ul className="flex flex-wrap gap-2.5">
        {citations.map((citation) => (
          <li key={citation.id}>
            <button
              type="button"
              onClick={() => onSelect(citation)}
              aria-current={activeId === citation.id ? 'true' : undefined}
              className={cn(
                'group flex max-w-72 items-center gap-2 border-2 border-border px-2.5 py-1.5 text-left',
                'shadow-xs transition-colors duration-100 ease-standard',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                activeId === citation.id
                  ? 'bg-accent text-accent-fg'
                  : 'bg-surface-raised hover:bg-accent-subtle',
              )}
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center border-[1.5px]
                           border-border bg-accent font-mono text-2xs font-bold text-accent-fg
                           tabular-nums"
              >
                {citation.index}
              </span>
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate text-[0.8125rem] font-semibold">
                {documentLabel(citation.source)}
              </span>
              {citation.page ? (
                <span className="shrink-0 font-mono text-2xs font-bold tabular-nums">
                  p.{citation.page}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
