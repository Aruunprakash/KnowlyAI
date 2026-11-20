import type { Citation } from '@/lib/api'
import { Tooltip } from '@/components/ui/Tooltip'
import { documentLabel } from '@/lib/utils/format'

export interface CitationMarkerProps {
  citation: Citation
  onClick: (citation: Citation) => void
}

/** The inline `[n]` reference inside an answer. */
export function CitationMarker({ citation, onClick }: CitationMarkerProps) {
  const where = citation.page ? `page ${citation.page}` : 'page unknown'

  return (
    <Tooltip
      content={
        <span className="block">
          <span className="font-medium">{documentLabel(citation.source)}</span>
          <span className="text-text-subtle"> · {where}</span>
        </span>
      }
    >
      <button
        type="button"
        onClick={() => onClick(citation)}
        aria-label={`Source ${citation.index}: ${citation.source}, ${where}`}
        className="mx-[0.12em] inline-flex h-[1.2em] min-w-[1.2em] translate-y-[-0.1em] items-center
                   justify-center border-[1.5px] border-border bg-accent px-[0.28em] align-baseline
                   font-mono text-[0.7em] font-bold leading-none text-accent-fg tabular-nums
                   transition-colors duration-100 ease-standard hover:bg-text hover:text-surface
                   focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
      >
        {citation.index}
      </button>
    </Tooltip>
  )
}
