import { cn } from '@/lib/utils/cn'

/** The square mark: a plum slab with an amber bar, as on the landing page's favicon. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex size-7 shrink-0 items-center justify-center bg-text', className)}
    >
      <span className="h-1.5 w-4 bg-accent" />
    </span>
  )
}

/**
 * The wordmark, set the way the landing page and console set it: a plum block,
 * expanded 900 caps, the AI in amber.
 */
export function Brand({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <span
        className="bg-[#561530] px-2 pt-1 pb-1.5 text-[1.0625rem] leading-none font-black
                   tracking-[-0.02em] text-[#f0f0ec] [font-stretch:125%]"
      >
        KNOWLY<span className="text-accent">AI</span>
      </span>
      <span className="type-label text-[0.625rem] text-text-subtle">Document Q&amp;A</span>
    </div>
  )
}
