import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

/**
 * Hover/focus hint. Shown on focus as well as hover so it is reachable by
 * keyboard, and marked up so screen readers announce it via aria-describedby.
 */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const id = useId()
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={() => setVisible(true)}
      onPointerLeave={() => setVisible(false)}
      onFocusCapture={() => setVisible(true)}
      onBlurCapture={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2',
          'rounded-md border border-border bg-surface-raised px-2 py-1 text-2xs leading-snug',
          'text-text shadow-md transition-[opacity,transform] duration-120 ease-standard',
          side === 'top' ? 'bottom-[calc(100%+6px)]' : 'top-[calc(100%+6px)]',
          visible
            ? 'translate-y-0 opacity-100'
            : cn('opacity-0', side === 'top' ? 'translate-y-1' : '-translate-y-1'),
          className,
        )}
      >
        {content}
      </span>
    </span>
  )
}
