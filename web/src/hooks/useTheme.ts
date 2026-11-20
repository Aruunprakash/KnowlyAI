import { useCallback, useEffect, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'knowly.theme'

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    /* Storage can be blocked; fall back to following the OS. */
  }
  // Light by default, to match the landing page and console. Dark is one click
  // away and is remembered once chosen.
  return 'light'
}

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Theme state, mirrored onto `data-theme` for the token stylesheet.
 * The first paint is handled by an inline script in index.html; this hook owns
 * every change after it.
 */
export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved: 'light' | 'dark' =
    preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    try {
      if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, preference)
    } catch {
      /* Preference simply will not persist. */
    }
  }, [preference, resolved])

  const toggle = useCallback(() => {
    setPreference(resolved === 'dark' ? 'light' : 'dark')
  }, [resolved])

  return { preference, resolved, setPreference, toggle }
}
