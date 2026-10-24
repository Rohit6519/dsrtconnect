'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Eye, Check, CircleNotch, Warning, PaperPlaneTilt,
  ArrowClockwise, Keyboard,
} from '@phosphor-icons/react'
import { useDraftEditor } from './useDraftEditor'
import { BlockEditor } from './BlockEditor'
import { TitleBlock } from './TitleBlock'
import { EditorRightPanel } from './EditorRightPanel'
import { MediaGallery } from './MediaGallery'
import { PosterView } from './PosterView'
import { PreviewModal } from './PreviewModal'
import { ContextSelectorModal } from './ContextSelectorModal'
import { ContextIndicator } from './ContextIndicator'
import { AdvancedSettingsPage } from './AdvancedSettingsPage'
import { useShortcuts } from '../shared/useShortcuts'
import { ShortcutsOverlay } from '../shared/ShortcutsOverlay'

type Tab = 'opportunity' | 'poster' | 'settings'

export function CreateOpportunityPage() {
  const router = useRouter()
  const { draft, loading, update, forceSave, saveStatus, lastSavedAt, error } = useDraftEditor()
  const [tab, setTab] = useState<Tab>('opportunity')
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)

  const handlePublish = useCallback(async () => {
    if (!draft.title.trim()) {
      setPublishError('Give your opportunity a title before publishing.')
      return
    }
    if (!draft.id) await forceSave()

    setPublishing(true)
    setPublishError(null)
    try {
      const res = await fetch(`/api/looking-for/drafts/publish?id=${draft.id}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      router.push(`/looking-for/${data.request.id}?source=team_up`)
    } catch (e: any) {
      setPublishError(e.message)
      setPublishing(false)
    }
  }, [draft.title, draft.id, forceSave, router])

  const handlePreview = useCallback(async () => {
    if (!draft.id) await forceSave()
    setShowPreview(true)
  }, [draft.id, forceSave])

  const ensureDraft = useCallback(async () => {
    if (draft.id) return draft.id
    if (!draft.title.trim()) return null
    await forceSave()
    return draft.id
  }, [draft.id, draft.title, forceSave])

  useShortcuts([
    { keys: 'mod+s',     handler: () => forceSave(),            description: 'Save draft' },
    { keys: 'mod+enter', handler: () => handlePublish(),        description: 'Publish' },
    { keys: 'mod+p',     handler: () => handlePreview(),        description: 'Preview' },
    { keys: 'mod+/',     handler: () => setShowShortcuts(true), description: 'Shortcuts help' },
  ], !loading && !publishing)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center">
        <div className="text-center">
          <CircleNotch size={20} className="text-zinc-500 animate-spin mx-auto mb-3" />
          <div className="text-[13px] text-zinc-500">Loading your draft...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex flex-col">
      <header className="sticky top-0 z-30 bg-[#0a0a0a] border-b border-zinc-800">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link
              href="/looking-for"
              className="inline-flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-200 shrink-0 font-semibold"
            >
              <ArrowLeft size={13} />
              <span className="hidden sm:inline">Team Up</span>
            </Link>
            <div className="text-zinc-700 hidden sm:inline">·</div>
            <ContextIndicator draft={draft} onClick={() => setShowContext(true)} />
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="hidden md:block">
              <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} error={error} onRetry={forceSave} />
            </div>
            <button
              onClick={() => setShowShortcuts(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (Ctrl+/)"
              className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-md border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white transition-colors"
            >
              <Keyboard size={13} weight="regular" />
            </button>
            <button
              onClick={handlePreview}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-600 text-[13px] font-semibold text-zinc-200 transition-colors"
            >
              <Eye size={13} weight="regular" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || !draft.title.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {publishing ? (
                <>
                  <CircleNotch size={13} className="animate-spin" />
                  <span className="hidden sm:inline">Publishing...</span>
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={13} weight="fill" />
                  Publish
                </>
              )}
            </button>
          </div>
        </div>

        <div className="md:hidden px-4 pb-2 border-b border-zinc-800">
          <SaveIndicator status={saveStatus} lastSavedAt={lastSavedAt} error={error} onRetry={forceSave} />
        </div>

        <div className="max-w-[1600px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-7">
            <TabButton active={tab === 'opportunity'} onClick={() => setTab('opportunity')}>
              Opportunity
            </TabButton>
            <TabButton active={tab === 'poster'} onClick={() => setTab('poster')}>
              Poster
            </TabButton>
            <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
              Advanced Settings
            </TabButton>
          </div>
        </div>
      </header>

      {publishError && (
        <div className="border-b border-red-500/40 bg-red-500/5">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-2 flex items-center gap-2 text-[13px] text-red-400 font-medium">
            <Warning size={13} weight="fill" />
            {publishError}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 pt-6 pb-16">
          {tab === 'opportunity' && (
            <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)_340px] gap-6 items-start">
              <aside className="order-2 lg:order-1">
                <div className="lg:sticky lg:top-[132px]">
                  <MediaGallery draftId={draft.id} onDraftNeeded={ensureDraft} />
                </div>
              </aside>

              <div className="order-1 lg:order-2 min-w-0">
                <TitleBlock
                  title={draft.title}
                  subline={draft.subline}
                  onTitleChange={(v) => update({ title: v })}
                  onSublineChange={(v) => update({ subline: v })}
                />
                <BlockEditor
                  content={draft.content_html}
                  onChange={(html, text) => update({ content_html: html, content_text: text })}
                />
              </div>

              <aside className="order-3">
                <div className="lg:sticky lg:top-[132px]">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                    <EditorRightPanel draft={draft} onChange={update} />
                  </div>
                </div>
              </aside>
            </div>
          )}

          {tab === 'poster' && <PosterView />}

          {tab === 'settings' && <AdvancedSettingsPage draft={draft} onChange={update} />}
        </div>
      </main>

      {showPreview && (
        <PreviewModal draft={draft} onClose={() => setShowPreview(false)} />
      )}
      {showContext && (
        <ContextSelectorModal draft={draft} onChange={update} onClose={() => setShowContext(false)} />
      )}
      {showShortcuts && (
        <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  )
}

function TabButton({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={
        'relative py-3.5 text-[14px] font-bold tracking-tight transition-colors ' +
        (active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200')
      }
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-white rounded-full" />
      )}
    </button>
  )
}

function SaveIndicator({
  status, lastSavedAt, error, onRetry,
}: {
  status: 'idle' | 'saving' | 'saved' | 'error'
  lastSavedAt: Date | null
  error: string | null
  onRetry: () => void
}) {
  if (status === 'saving') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 font-medium" role="status" aria-live="polite">
        <CircleNotch size={11} className="animate-spin" />
        Saving...
      </div>
    )
  }
  if (status === 'error') {
    return (
      <button
        onClick={onRetry}
        aria-label="Retry save"
        className="inline-flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-300 font-medium"
      >
        <Warning size={11} weight="fill" />
        Unable to save
        <span className="inline-flex items-center gap-1 ml-1">
          <ArrowClockwise size={10} />
          Retry
        </span>
      </button>
    )
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 font-medium" role="status" aria-live="polite">
        <Check size={11} weight="bold" className="text-emerald-400" />
        Saved {timeAgo(lastSavedAt)}
      </div>
    )
  }
  return null
}

function timeAgo(d: Date): string {
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 30) return 'just now'
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return d.toLocaleTimeString()
}
