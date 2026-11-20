import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { IconButton } from './IconButton'

export interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Built on the native <dialog> element, which supplies focus trapping, Escape
 * handling, inert background content, and the top layer — all things a
 * hand-rolled modal gets subtly wrong.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (open && !element.open) element.showModal()
    else if (!open && element.open) element.close()
  }, [open])

  useEffect(() => {
    const element = ref.current
    if (!element) return
    // Fires for Escape and for programmatic close alike.
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    element.addEventListener('cancel', onCancel)
    return () => element.removeEventListener('cancel', onCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      onClick={(event) => {
        // Clicks land on the dialog itself only when they hit the backdrop.
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface-raised',
        'p-0 text-text shadow-lg backdrop:bg-surface-overlay backdrop:backdrop-blur-[2px]',
        'open:animate-[dialog-in_180ms_var(--ease-out-quint)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 px-5 pt-4.5 pb-3">
        <div className="min-w-0">
          <h2 id="dialog-title" className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {description ? (
            <p id="dialog-description" className="mt-1 text-sm leading-relaxed text-text-muted">
              {description}
            </p>
          ) : null}
        </div>
        <IconButton
          label="Close"
          size="sm"
          icon={<X className="size-4" />}
          onClick={onClose}
          className="-mt-0.5 -mr-1.5"
        />
      </div>

      {children ? <div className="px-5 pb-1 text-sm">{children}</div> : null}

      {footer ? (
        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border bg-surface-sunken px-5 py-3.5">
          {footer}
        </div>
      ) : null}

      <style>{`@keyframes dialog-in {
        from { opacity: 0; transform: translateY(6px) scale(0.985); }
        to { opacity: 1; transform: none; }
      }`}</style>
    </dialog>
  )
}
