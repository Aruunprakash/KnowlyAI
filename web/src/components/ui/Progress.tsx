import { cn } from '@/lib/utils/cn'

export interface ProgressProps {
  /** 0–1. Pass null for indeterminate work of unknown length. */
  value: number | null
  label: string
  className?: string
}

export function Progress({ value, label, className }: ProgressProps) {
  const indeterminate = value === null
  const percent = indeterminate ? 0 : Math.min(100, Math.max(0, value * 100))

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={indeterminate ? undefined : Math.round(percent)}
      className={cn('h-1.5 w-full overflow-hidden border border-border bg-surface-inset', className)}
    >
      <div
        className={cn(
          'h-full bg-accent',
          indeterminate
            ? 'w-1/3 animate-[progress-sweep_1.25s_var(--ease-standard)_infinite]'
            : 'transition-[width] duration-300 ease-out-quint',
        )}
        style={indeterminate ? undefined : { width: `${percent}%` }}
      />
      <style>{`@keyframes progress-sweep {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(300%); }
      }`}</style>
    </div>
  )
}
