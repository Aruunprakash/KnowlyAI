import { ExternalLink, FileText, X } from 'lucide-react'
import type { Citation } from '@/lib/api'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/utils/cn'

export interface CitationDetailProps {
  citation: Citation | null
  onClose: () => void
}

/**
 * The retrieved passage, shown verbatim.
 *
 * This is the part that makes an answer auditable, so the snippet is presented
 * as evidence — monospaced, unstyled, not summarised — with a link straight to
 * the page it was taken from.
 */
export function CitationDetail({ citation, onClose }: CitationDetailProps) {
  // Kept mounted only while something is selected: on wide screens the panel
  // docks as a real column, so an empty one would just eat reading width.
  if (!citation) return null

  return (
    <aside
      aria-label="Source passage"
      className={cn(
        'fixed inset-y-0 right-0 z-30 flex w-full max-w-96 flex-col',
        'border-l-[3px] border-border bg-surface-raised shadow-lg',
        'animate-[panel-in_220ms_var(--ease-out-quint)]',
        'lg:static lg:z-auto lg:w-96 lg:shrink-0 lg:shadow-none',
      )}
    >
      <>
          <header className="flex items-start gap-3 border-b-[3px] border-border bg-text px-4 py-3.5 text-surface">
            <span
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center bg-accent font-mono
                         text-2xs font-bold text-accent-fg tabular-nums"
            >
              {citation.index}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[0.9375rem] font-black [font-stretch:88%]" title={citation.source}>
                {citation.source}
              </h2>
              <p className="type-label mt-1 flex items-center gap-2 text-[0.625rem] opacity-85">
                <span>{citation.page ? `Page ${citation.page}` : 'Page unknown'}</span>
                {citation.score !== null ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {Math.round(citation.score * 100)}% match
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <IconButton
              label="Close source panel"
              size="sm"
              icon={<X className="size-4" />}
              onClick={onClose}
              className="-mt-0.5 -mr-1 text-surface hover:bg-surface hover:text-text"
            />
          </header>

          <div className="scrollbar-slim flex-1 overflow-y-auto px-4 py-4">
            <Badge tone="neutral" className="mb-3">
              <FileText className="size-3" aria-hidden="true" />
              Retrieved passage
            </Badge>
            <blockquote
              className="border-2 border-border bg-surface-sunken p-3.5 font-mono text-[0.8125rem]
                         leading-[1.7] whitespace-pre-wrap text-text shadow-sm"
            >
              {citation.snippet || 'This passage came back without text.'}
            </blockquote>
            <p className="mt-3 text-2xs leading-relaxed text-text-subtle">
              This is the raw chunk handed to the model, not a paraphrase. The answer above should
              be traceable to it.
            </p>
          </div>

          {citation.documentId ? (
            <footer className="border-t-[3px] border-border px-4 py-3">
              <a
                href={api.documentFileUrl(citation.documentId, citation.page)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border-2 border-border bg-accent px-3 py-2
                           text-[0.75rem] font-bold text-accent-fg uppercase shadow-sm
                           [font-stretch:112%] hover:bg-accent-hover focus-visible:outline-3
                           focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <ExternalLink className="size-3.5" aria-hidden="true" />
                Open {citation.page ? `page ${citation.page}` : 'document'} in a new tab
              </a>
            </footer>
          ) : null}
      </>

      <style>{`@keyframes panel-in {
        from { transform: translateX(100%); }
        to { transform: none; }
      }`}</style>
    </aside>
  )
}
