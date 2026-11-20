import { useEffect, useRef } from 'react'

export interface Hotkey {
  /** Lower-case `event.key`, e.g. 'k', 'enter', 'escape', '/'. */
  key: string
  mod?: boolean
  shift?: boolean
  /** Fire even while a text field has focus (Escape, Cmd+Enter). */
  allowInField?: boolean
  handler: (event: KeyboardEvent) => void
}

function isTextField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

/**
 * Document-level shortcuts. `mod` is Cmd on Apple platforms and Ctrl elsewhere,
 * so the bindings read naturally on either.
 */
export function useHotkeys(hotkeys: Hotkey[]): void {
  const latest = useRef(hotkeys)
  latest.current = hotkeys

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isApple = /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent)
      const mod = isApple ? event.metaKey : event.ctrlKey

      for (const hotkey of latest.current) {
        if (event.key.toLowerCase() !== hotkey.key.toLowerCase()) continue
        if (Boolean(hotkey.mod) !== mod) continue
        if (hotkey.shift !== undefined && hotkey.shift !== event.shiftKey) continue
        if (!hotkey.allowInField && isTextField(event.target)) continue

        event.preventDefault()
        hotkey.handler(event)
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

/** 'Cmd' on Apple platforms, 'Ctrl' elsewhere — for shortcut captions. */
export function modifierLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl'
  return /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl'
}
