import { useRef } from 'react'
import { AlertCircle, Plus, RefreshCw } from 'lucide-react'
import type { SourceDocument } from '@/lib/api'
import type { PendingUpload } from '@/hooks/useDocuments'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { formatBytes, pluralize } from '@/lib/utils/format'
import { DocumentRow } from './DocumentRow'
import { UploadRow } from './UploadRow'

export interface SourcesPanelProps {
  documents: SourceDocument[]
  uploads: PendingUpload[]
  isLoading: boolean
  loadError: string | null
  maxUploadBytes: number
  onUpload: (files: File[]) => void
  onDismissUpload: (id: string) => void
  onRemove: (document: SourceDocument) => void
  onRefresh: () => void
  /** Lets the parent trigger the hidden file input from elsewhere. */
  pickerRef?: React.RefObject<(() => void) | null>
}

export function SourcesPanel({
  documents,
  uploads,
  isLoading,
  loadError,
  maxUploadBytes,
  onUpload,
  onDismissUpload,
  onRemove,
  onRefresh,
  pickerRef,
}: SourcesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const openPicker = () => inputRef.current?.click()
  if (pickerRef) pickerRef.current = openPicker

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pt-1 pb-2">
        <h2 className="type-label text-2xs text-text-subtle">
          Sources
        </h2>
        <div className="flex items-center gap-0.5">
          <IconButton
            label="Reload sources"
            size="sm"
            icon={<RefreshCw className="size-3.5" />}
            onClick={onRefresh}
          />
          <IconButton
            label="Add a PDF"
            size="sm"
            icon={<Plus className="size-4" />}
            onClick={openPicker}
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          if (files.length) onUpload(files)
          // Reset so re-selecting the same file fires change again.
          event.target.value = ''
        }}
      />

      <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto px-1.5 pb-2">
        {uploads.length ? (
          <ul className="mb-2 flex flex-col gap-1.5 px-0.5">
            {uploads.map((upload) => (
              <UploadRow key={upload.id} upload={upload} onDismiss={onDismissUpload} />
            ))}
          </ul>
        ) : null}

        {loadError ? (
          <div
            role="alert"
            className="mx-0.5 mb-2 border-2 border-danger bg-danger-subtle p-2.5"
          >
            <p className="flex items-start gap-2 text-2xs leading-relaxed">
              <AlertCircle className="mt-px size-3.5 shrink-0 text-danger" aria-hidden="true" />
              <span>{loadError}</span>
            </p>
            <Button size="sm" variant="secondary" className="mt-2 w-full" onClick={onRefresh}>
              Retry
            </Button>
          </div>
        ) : null}

        {isLoading ? (
          <ul className="flex flex-col gap-1" aria-label="Loading sources">
            {[0, 1, 2].map((index) => (
              <li key={index} className="flex items-start gap-2.5 px-2 py-2">
                <span className="mt-0.5 size-4 shrink-0 animate-pulse  bg-surface-inset" />
                <span className="min-w-0 flex-1">
                  <span
                    className="block h-3 animate-pulse  bg-surface-inset"
                    style={{ width: `${72 - index * 14}%` }}
                  />
                  <span className="mt-1.5 block h-2.5 w-2/5 animate-pulse  bg-surface-inset" />
                </span>
              </li>
            ))}
          </ul>
        ) : documents.length ? (
          <ul className="flex flex-col">
            {documents.map((document) => (
              <DocumentRow key={document.id} document={document} onRemove={onRemove} />
            ))}
          </ul>
        ) : uploads.length ? null : (
          <div className="px-2.5 py-4">
            <p className="text-[0.8125rem] leading-relaxed text-text-muted">
              Nothing indexed yet. Drop a PDF anywhere in the window, or
            </p>
            <Button size="sm" className="mt-2.5 w-full" variant="primary" onClick={openPicker}>
              Choose a PDF
            </Button>
            <p className="mt-2 text-2xs text-text-subtle">
              PDF only, up to {formatBytes(maxUploadBytes)} each.
            </p>
          </div>
        )}
      </div>

      {documents.length ? (
        <footer className="border-t-2 border-border px-3 py-2.5 font-mono text-2xs text-text-subtle tabular-nums">
          {pluralize(documents.length, 'document')} ·{' '}
          {pluralize(
            documents.reduce((sum, document) => sum + document.chunks, 0),
            'chunk',
          )}{' '}
          indexed
        </footer>
      ) : null}
    </div>
  )
}
