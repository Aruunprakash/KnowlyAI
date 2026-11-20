import { Moon, Sun } from 'lucide-react'
import { IconButton } from '@/components/ui/IconButton'

export interface SystemStatusProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

/**
 * The sidebar footer. It used to report the backend's health (connected,
 * degraded, which models, how to start the API); that is the backend's
 * business, not the reader's, so it is gone. What is left is the way back to
 * the rest of the site and the theme control.
 *
 * The links are relative to the build that ships beside the landing page and
 * console (`npm run build:set`, served at /app/). In the plain build that the
 * API serves on its own, there is nothing beside it to link to, so they hide.
 */
export function SystemStatus({ theme, onToggleTheme }: SystemStatusProps) {
  const inSet = import.meta.env.VITE_SET === 'true'

  return (
    <footer className="flex items-center gap-1 border-t-[3px] border-border px-3 py-2">
      {inSet ? (
        <nav aria-label="KnowlyAI site" className="flex items-center gap-3 text-2xs">
          <a
            href="../"
            className="type-label text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Home
          </a>
          <a
            href="../console.html"
            className="type-label text-text-muted underline-offset-4 hover:text-text hover:underline"
          >
            Console
          </a>
        </nav>
      ) : null}

      <IconButton
        label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        size="sm"
        className="ml-auto"
        onClick={onToggleTheme}
        icon={theme === 'dark' ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
      />
    </footer>
  )
}
