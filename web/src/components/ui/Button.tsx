import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

/* Slabs: a 2px rule and a hard offset shadow. Pressing sinks the slab into its
   shadow rather than scaling it, so the press reads as physical. */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-fg border-2 border-border shadow-sm hover:bg-accent-hover ' +
    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-55',
  secondary:
    'bg-surface-raised text-text border-2 border-border shadow-sm hover:bg-accent ' +
    'hover:text-accent-fg active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
  ghost: 'text-text-muted hover:bg-surface-sunken hover:text-text',
  danger:
    'bg-danger text-white border-2 border-border shadow-sm hover:brightness-110 ' +
    'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[0.75rem] gap-1.5',
  md: 'h-9 px-3.5 text-[0.8125rem] gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap',
        'font-bold uppercase tracking-[0.03em] [font-stretch:112%]',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-100 ease-standard',
        'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
        'disabled:pointer-events-none disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-3.5" /> : iconLeft}
      {children}
      {iconRight}
    </button>
  )
})
