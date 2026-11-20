import { useCallback, useEffect, useRef, useState } from 'react'
import { api, isAbort, toApiError } from '@/lib/api'
import type { HealthReport, SourceDocument } from '@/lib/api'
import { createId } from '@/lib/utils/id'

export interface PendingUpload {
  id: string
  name: string
  sizeBytes: number
  progress: number
  /** `uploading` while bytes move, `indexing` once the server has them. */
  phase: 'uploading' | 'indexing' | 'failed'
  error: string | null
  cancel: () => void
}

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024

/** Owns the source library: the indexed documents plus anything mid-upload. */
export function useDocuments() {
  const [documents, setDocuments] = useState<SourceDocument[]>([])
  const [uploads, setUploads] = useState<PendingUpload[]>([])
  const [health, setHealth] = useState<HealthReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const [list, report] = await Promise.all([
        api.listDocuments(signal),
        api.getHealth(signal).catch(() => null),
      ])
      if (!mounted.current) return
      setDocuments(list)
      setHealth(report)
      setLoadError(null)
    } catch (error) {
      if (isAbort(error) || !mounted.current) return
      setLoadError(toApiError(error).userMessage)
    } finally {
      if (mounted.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    return () => controller.abort()
  }, [refresh])

  const upload = useCallback(
    (file: File) => {
      const id = createId('upl')

      const reject = (message: string) => {
        setUploads((current) => [
          { id, name: file.name, sizeBytes: file.size, progress: 0, phase: 'failed', error: message, cancel: () => {} },
          ...current,
        ])
      }

      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
        reject('Only PDF files can be indexed.')
        return
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        reject('That file is over the 50 MB limit.')
        return
      }
      if (file.size === 0) {
        reject('That file is empty.')
        return
      }

      const handle = api.uploadDocument(file, (fraction) => {
        if (!mounted.current) return
        setUploads((current) =>
          current.map((pending) =>
            pending.id === id
              ? {
                  ...pending,
                  progress: fraction,
                  phase: fraction >= 1 ? 'indexing' : 'uploading',
                }
              : pending,
          ),
        )
      })

      setUploads((current) => [
        {
          id,
          name: file.name,
          sizeBytes: file.size,
          progress: 0,
          phase: 'uploading',
          error: null,
          cancel: handle.cancel,
        },
        ...current,
      ])

      handle.result
        .then((document) => {
          if (!mounted.current) return
          setUploads((current) => current.filter((pending) => pending.id !== id))
          setDocuments((current) => [document, ...current.filter((d) => d.id !== document.id)])
          void refresh()
        })
        .catch((error: unknown) => {
          if (!mounted.current) return
          const apiError = toApiError(error)
          if (apiError.kind === 'aborted') {
            setUploads((current) => current.filter((pending) => pending.id !== id))
            return
          }
          setUploads((current) =>
            current.map((pending) =>
              pending.id === id
                ? { ...pending, phase: 'failed', error: apiError.userMessage }
                : pending,
            ),
          )
        })
    },
    [refresh],
  )

  const uploadMany = useCallback(
    (files: Iterable<File>) => {
      for (const file of files) upload(file)
    },
    [upload],
  )

  const dismissUpload = useCallback((id: string) => {
    setUploads((current) => {
      current.find((pending) => pending.id === id)?.cancel()
      return current.filter((pending) => pending.id !== id)
    })
  }, [])

  /** Optimistic removal, rolled back if the server rejects it. */
  const remove = useCallback(
    async (id: string) => {
      const snapshot = documents
      setDocuments((current) => current.filter((document) => document.id !== id))
      try {
        await api.deleteDocument(id)
        void refresh()
      } catch (error) {
        if (!mounted.current) return
        setDocuments(snapshot)
        setLoadError(toApiError(error).userMessage)
      }
    },
    [documents, refresh],
  )

  return {
    documents,
    uploads,
    health,
    isLoading,
    loadError,
    refresh,
    upload,
    uploadMany,
    dismissUpload,
    remove,
    maxUploadBytes: MAX_UPLOAD_BYTES,
  }
}
