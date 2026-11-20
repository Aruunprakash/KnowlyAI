import { useEffect, useRef, useState } from 'react'

/**
 * Window-wide drag-and-drop. Dropping anywhere in the app is what people
 * actually try, so the whole viewport is the target rather than one small box.
 *
 * Drag enter/leave fire for every child element, so a counter tracks depth
 * instead of toggling on each event — otherwise the overlay flickers.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const depth = useRef(0)
  const handler = useRef(onFiles)
  handler.current = onFiles

  useEffect(() => {
    const carriesFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes('Files')

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth.current += 1
      setIsDragging(true)
    }

    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      // Without this the browser navigates to the dropped file.
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }

    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setIsDragging(false)
    }

    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth.current = 0
      setIsDragging(false)
      const files = Array.from(event.dataTransfer?.files ?? [])
      if (files.length) handler.current(files)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  return isDragging
}
