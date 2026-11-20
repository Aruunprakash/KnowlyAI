import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

type Variant = 'ghost' | 'subtle' | 'danger'
type Size = 'sm' | 'md'

const VARIANTS: Record<Variant, string> = {
  ghost: 'text-text-subtle hover:bg-surface-sunken hover:text-text',
  subtle: 'bg-surface-raised border border-border text-text-muted shadow-xs hover:bg-surface-sunken hover:text-text',
  danger: 'text-text-subtle hover:bg-danger-subtle hover:text-danger',
}

const SIZES: Record<Size, string> = {
  sm: 'size-7 rounded-md',
  md: 'size-9 rounded-md',
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: these buttons have no visible text. */
  label: string
  icon: ReactNode
  variant?: Variant
  size?: Size
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-colors duration-150 ease-standard',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
})
