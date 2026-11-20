import { AlertCircle, FileText, Trash2 } from 'lucide-react'
import type { SourceDocument } from '@/lib/api'
import { IconButton } from '@/components/ui/IconButton'
import { Spinner } from '@/components/ui/Spinner'
import { documentLabel, formatBytes, formatRelativeTime, pluralize } from '@/lib/utils/format'

export interface DocumentRowProps {
  document: SourceDocument
  onRemove: (document: SourceDocument) => void
}

export function DocumentRow({ document, onRemove }: DocumentRowProps) {
  const failed = document.status === 'failed'
  const processing = document.status === 'processing'

  return (
    <li
      className="group/row flex items-start gap-2.5 border-b border-rule px-2 py-2 transition-colors
                 hover:bg-accent-subtle"
    >
      <span className="mt-0.5 shrink-0 text-text-subtle" aria-hidden="true">
        {processing ? (
          <Spinner className="size-4 text-accent-ink" />
        ) : failed ? (
          <AlertCircle className="size-4 text-danger" />
        ) : (
          <FileText className="size-4" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.8125rem] font-bold text-text" title={document.name}>
          {documentLabel(document.name)}
        </p>
        <p className="mt-0.5 truncate font-mono text-2xs text-text-subtle">
          {failed ? (
            <span className="text-danger">{document.error ?? 'Indexing failed'}</span>
          ) : processing ? (
            'Indexing…'
          ) : (
            <>
              {pluralize(document.pages, 'page')} · {pluralize(document.chunks, 'chunk')} ·{' '}
              {formatBytes(document.sizeBytes)} ·{' '}
              <time dateTime={document.uploadedAt}>
                {formatRelativeTime(document.uploadedAt)}
              </time>
            </>
          )}
        </p>
      </div>

      {/* Reserved cell, so revealing the button on hover never reflows the row. */}
      <div className="grid size-7 shrink-0 place-items-center">
        <IconButton
          label={`Remove ${document.name}`}
          size="sm"
          variant="danger"
          icon={<Trash2 className="size-3.5" />}
          onClick={() => onRemove(document)}
          className="opacity-0 transition-opacity duration-150 focus-visible:opacity-100
                     group-hover/row:opacity-100"
        />
      </div>
    </li>
  )
}
