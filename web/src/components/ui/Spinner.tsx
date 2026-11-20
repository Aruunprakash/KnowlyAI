import { cn } from '@/lib/utils/cn'

/** Indeterminate activity. Decorative: give the surrounding region the label. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('size-4 animate-spin', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="2.5" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Three-dot "working on it" indicator, used before the first token arrives. */
export function ThinkingDots({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="size-1.5 bg-text-subtle"
          style={{
            animation: 'thinking-pulse 1.3s ease-in-out infinite',
            animationDelay: `${index * 0.16}s`,
          }}
        />
      ))}
      <style>{`@keyframes thinking-pulse {
        0%, 70%, 100% { opacity: 0.25; transform: translateY(0); }
        35% { opacity: 1; transform: translateY(-2px); }
      }`}</style>
    </span>
  )
}
