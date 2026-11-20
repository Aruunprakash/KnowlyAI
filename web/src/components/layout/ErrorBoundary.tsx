import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

interface State {
  error: Error | null
}

/**
 * Last line of defence. A render crash would otherwise leave a blank page with
 * the real cause only in the console, which is the worst way to fail.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-full items-center justify-center bg-surface p-6 text-text">
        <div className="w-full max-w-md rounded-xl border border-border bg-surface-raised p-5 shadow-md">
          <h1 className="text-base font-semibold tracking-[-0.01em]">Something broke in the UI</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            The interface hit an error it could not recover from. Reloading usually clears it; the
            details below are what to report if it keeps happening.
          </p>
          <pre
            className="scrollbar-slim mt-3 max-h-40 overflow-auto rounded-lg border border-border
                       bg-surface-sunken p-3 font-mono text-2xs leading-relaxed whitespace-pre-wrap"
          >
            {error.message}
          </pre>
          <Button
            variant="primary"
            className="mt-4 w-full"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      </div>
    )
  }
}
