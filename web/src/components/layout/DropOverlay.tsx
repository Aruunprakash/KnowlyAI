import { FileUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/** Shown while a file is dragged over the window. Pointer-transparent so the
 *  drop still reaches the window listener underneath. */
export function DropOverlay({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-6',
        'bg-surface-overlay backdrop-blur-[3px] transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent',
          'bg-surface-raised px-10 py-8 shadow-lg transition-transform duration-200 ease-out-quint',
          visible ? 'scale-100' : 'scale-95',
        )}
      >
        <FileUp className="size-6 text-accent-ink" aria-hidden="true" />
        <p className="text-sm font-medium">Drop to index</p>
        <p className="text-2xs text-text-subtle">PDF files only</p>
      </div>
    </div>
  )
}
