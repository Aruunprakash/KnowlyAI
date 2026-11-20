import { useCallback, useEffect, useRef, useState } from 'react'

const BOTTOM_THRESHOLD_PX = 48

/**
 * Keeps a scroll container pinned to the bottom while content streams in, but
 * yields the moment the reader scrolls up — the thing most chat UIs get wrong.
 * Re-pins when they return to the bottom themselves.
 */
export function useStickToBottom<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T | null>(null)
  const pinnedRef = useRef(true)
  const [isPinned, setIsPinned] = useState(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const element = ref.current
    if (!element) return
    pinnedRef.current = true
    setIsPinned(true)
    element.scrollTo({ top: element.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const onScroll = () => {
      const pinned =
        element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_THRESHOLD_PX
      if (pinned !== pinnedRef.current) {
        pinnedRef.current = pinned
        setIsPinned(pinned)
      }
    }

    element.addEventListener('scroll', onScroll, { passive: true })
    return () => element.removeEventListener('scroll', onScroll)
  }, [])

  // Follow growth caused by streaming text, not just by new messages.
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) element.scrollTop = element.scrollHeight
    })
    for (const child of Array.from(element.children)) observer.observe(child)
    return () => observer.disconnect()
  }, [dependency])

  useEffect(() => {
    if (pinnedRef.current) {
      const element = ref.current
      if (element) element.scrollTop = element.scrollHeight
    }
  }, [dependency])

  return { ref, isPinned, scrollToBottom }
}
