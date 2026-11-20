import { AlertCircle, FileUp, X } from 'lucide-react'
import type { PendingUpload } from '@/hooks/useDocuments'
import { IconButton } from '@/components/ui/IconButton'
import { Progress } from '@/components/ui/Progress'
import { documentLabel, formatBytes } from '@/lib/utils/format'

export interface UploadRowProps {
  upload: PendingUpload
  onDismiss: (id: string) => void
}

export function UploadRow({ upload, onDismiss }: UploadRowProps) {
  const failed = upload.phase === 'failed'

  return (
    <li className="border-2 border-border bg-surface-raised px-2.5 py-2 shadow-xs">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          {failed ? (
            <AlertCircle className="size-4 text-danger" />
          ) : (
            <FileUp className="size-4 text-accent-ink" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.8125rem] font-medium" title={upload.name}>
            {documentLabel(upload.name)}
          </p>
          <p className="mt-0.5 truncate text-2xs text-text-subtle">
            {failed ? (
              <span className="text-danger">{upload.error ?? 'Upload failed'}</span>
            ) : upload.phase === 'indexing' ? (
              'Splitting and embedding. This can take a minute'
            ) : (
              `Uploading · ${formatBytes(upload.sizeBytes)}`
            )}
          </p>
        </div>

        <IconButton
          label={failed ? 'Dismiss' : `Cancel upload of ${upload.name}`}
          size="sm"
          icon={<X className="size-3.5" />}
          onClick={() => onDismiss(upload.id)}
          className="-mt-0.5 -mr-1"
        />
      </div>

      {failed ? null : (
        <Progress
          className="mt-2"
          label={`Upload progress for ${upload.name}`}
          // Indexing time is unknown; a sweeping bar is honest, a stuck 100% is not.
          value={upload.phase === 'indexing' ? null : upload.progress}
        />
      )}
    </li>
  )
}
