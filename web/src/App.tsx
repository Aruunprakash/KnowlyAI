import { useCallback, useRef, useState } from 'react'
import { PanelLeft, Plus, X } from 'lucide-react'
import type { Citation, SourceDocument } from '@/lib/api'
import { useChat } from '@/hooks/useChat'
import { useDocuments } from '@/hooks/useDocuments'
import { useFileDrop } from '@/hooks/useFileDrop'
import { useHotkeys, modifierLabel } from '@/hooks/useHotkeys'
import { useStickToBottom } from '@/hooks/useStickToBottom'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { Kbd } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { Brand } from '@/components/layout/Brand'
import { DropOverlay } from '@/components/layout/DropOverlay'
import { SystemStatus } from '@/components/layout/SystemStatus'
import { SourcesPanel } from '@/components/documents/SourcesPanel'
import { CitationDetail } from '@/components/chat/CitationDetail'
import { Composer, type ComposerHandle } from '@/components/chat/Composer'
import { Message } from '@/components/chat/Message'
import { Welcome } from '@/components/chat/Welcome'
import { cn } from '@/lib/utils/cn'

export default function App() {
  const theme = useTheme()
  const library = useDocuments()
  const chat = useChat()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<SourceDocument | null>(null)

  const composerRef = useRef<ComposerHandle>(null)
  const pickerRef = useRef<(() => void) | null>(null)

  const isDragging = useFileDrop(library.uploadMany)
  const transcript = useStickToBottom<HTMLDivElement>(
    chat.messages.length + (chat.messages.at(-1)?.content.length ?? 0),
  )

  const readyCount = library.documents.filter((document) => document.status === 'ready').length

  const ask = useCallback(
    (question: string) => {
      chat.send(question)
      setSidebarOpen(false)
    },
    [chat],
  )

  useHotkeys([
    { key: 'k', mod: true, allowInField: true, handler: () => composerRef.current?.focus() },
    { key: 'u', mod: true, handler: () => pickerRef.current?.() },
    {
      key: 'escape',
      allowInField: true,
      handler: () => {
        if (pendingRemoval) setPendingRemoval(null)
        else if (activeCitation) setActiveCitation(null)
        else if (sidebarOpen) setSidebarOpen(false)
      },
    },
  ])

  return (
    <div className="flex h-full overflow-hidden bg-surface text-text">
      <DropOverlay visible={isDragging} />

      {/* Sidebar: a persistent column from `lg` up, an overlay drawer below it. */}
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sources"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-surface-overlay backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <nav
        aria-label="Sources"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r-[3px] border-border bg-surface-sunken',
          'transition-transform duration-250 ease-out-quint',
          'lg:static lg:w-68 lg:translate-x-0 lg:transition-none',
          sidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <Brand />
          <IconButton
            label="Close sources"
            size="sm"
            className="lg:hidden"
            icon={<X className="size-4" />}
            onClick={() => setSidebarOpen(false)}
          />
        </div>

        <div className="px-3 pb-3">
          <Tooltip
            side="bottom"
            content={
              <span>
                New conversation. Your sources stay indexed.
              </span>
            }
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              iconLeft={<Plus className="size-3.5" />}
              onClick={() => {
                chat.clear()
                setActiveCitation(null)
                setSidebarOpen(false)
                composerRef.current?.focus()
              }}
            >
              New conversation
            </Button>
          </Tooltip>
        </div>

        <SourcesPanel
          documents={library.documents}
          uploads={library.uploads}
          isLoading={library.isLoading}
          loadError={library.loadError}
          maxUploadBytes={library.maxUploadBytes}
          onUpload={library.uploadMany}
          onDismissUpload={library.dismissUpload}
          onRemove={setPendingRemoval}
          onRefresh={() => void library.refresh()}
          pickerRef={pickerRef}
        />

        <SystemStatus theme={theme.resolved} onToggleTheme={theme.toggle} />
      </nav>

      {/* Conversation */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex h-13 shrink-0 items-center gap-2 border-b-[3px] border-border px-3 lg:hidden"
        >
          <IconButton
            label="Open sources"
            icon={<PanelLeft className="size-4.5" />}
            onClick={() => setSidebarOpen(true)}
          />
          <Brand className="mx-auto" />
          <IconButton
            label="New conversation"
            icon={<Plus className="size-4.5" />}
            onClick={() => {
              chat.clear()
              setActiveCitation(null)
            }}
          />
        </header>

        <div
          ref={transcript.ref}
          className="scrollbar-slim relative min-h-0 flex-1 overflow-y-auto"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-8 sm:px-6">
            {chat.messages.length === 0 ? (
              <Welcome
                documents={library.documents}
                onPick={ask}
                onAddDocument={() => pickerRef.current?.()}
              />
            ) : (
              <div className="flex flex-col gap-7">
                {chat.messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    activeCitationId={activeCitation?.id ?? null}
                    onCitationSelect={setActiveCitation}
                    onRetry={chat.retry}
                  />
                ))}
              </div>
            )}
          </div>

          {!transcript.isPinned && chat.messages.length > 0 ? (
            <button
              type="button"
              onClick={() => transcript.scrollToBottom()}
              className="type-label sticky bottom-3 left-1/2 ml-[-5.25rem] flex w-42 items-center
                         justify-center gap-1.5 border-2 border-border bg-accent px-3 py-1.5 text-2xs
                         text-accent-fg shadow-sm transition-colors hover:bg-accent-hover"
            >
              Jump to latest
            </button>
          ) : null}
        </div>

        <Composer
          ref={composerRef}
          onSend={ask}
          onStop={chat.stop}
          isStreaming={chat.isStreaming}
          documentCount={readyCount}
        />
      </main>

      {/* Citation inspector: a column on wide screens, a drawer otherwise. */}
      {activeCitation ? (
        <button
          type="button"
          aria-label="Close source panel"
          onClick={() => setActiveCitation(null)}
          className="fixed inset-0 z-20 bg-surface-overlay backdrop-blur-[2px] lg:hidden"
        />
      ) : null}
      <CitationDetail citation={activeCitation} onClose={() => setActiveCitation(null)} />

      <Dialog
        open={pendingRemoval !== null}
        onClose={() => setPendingRemoval(null)}
        title="Remove this document?"
        description={
          pendingRemoval
            ? `${pendingRemoval.name} and its ${pendingRemoval.chunks.toLocaleString()} indexed chunks will be deleted. Answers already given keep their citations, but the passages behind them will no longer open.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPendingRemoval(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (pendingRemoval) void library.remove(pendingRemoval.id)
                setPendingRemoval(null)
              }}
            >
              Remove
            </Button>
          </>
        }
      />

      <p className="sr-only" aria-live="polite">
        {chat.isStreaming ? 'KnowlyAI is answering.' : ''}
      </p>

      {/* Discoverability without a cheat-sheet modal. */}
      <span className="sr-only">
        Press <Kbd>{modifierLabel()}</Kbd> plus K to focus the question box.
      </span>
    </div>
  )
}
