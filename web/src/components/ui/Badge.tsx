import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-inset text-text-muted border-border',
  accent: 'bg-accent-subtle text-accent-ink border-accent-border',
  success: 'bg-success/12 text-success border-success/25',
  warning: 'bg-warning/14 text-warning border-warning/30',
  danger: 'bg-danger-subtle text-danger border-danger/25',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'type-label inline-flex items-center gap-1 border-[1.5px] px-2 py-0.5 text-[0.625rem]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Keyboard shortcut caption, e.g. ⌘K. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center border-[1.5px] border-border',
        'bg-surface-raised px-1.5 font-mono text-2xs font-bold text-text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}
