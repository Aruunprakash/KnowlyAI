const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'n/a'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${BYTE_UNITS[exponent]}`
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return 'n/a'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`
}

const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/** "just now", "4 min ago", "yesterday" — falls back to a date past a week. */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''

  const seconds = Math.round((then - Date.now()) / 1000)
  const absolute = Math.abs(seconds)

  if (absolute < 45) return 'just now'
  if (absolute < 3600) return RELATIVE.format(Math.round(seconds / 60), 'minute')
  if (absolute < 86_400) return RELATIVE.format(Math.round(seconds / 3600), 'hour')
  if (absolute < 604_800) return RELATIVE.format(Math.round(seconds / 86_400), 'day')

  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(then)
}

export function formatTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

/** Strip the extension so long PDF names stay readable in tight rows. */
export function documentLabel(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`
}
