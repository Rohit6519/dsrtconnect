'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  PushPin, Check, CircleNotch, Plus, ClockCounterClockwise
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { DocumentBlockItem, BlockData } from './DocumentBlockItem'

interface Props {
  slug: string
  document: any
  isOwner: boolean
  onDocUpdated: (updated: any) => void
}

const CATEGORIES = ['General', 'Product', 'Technology', 'Research', 'Roadmap', 'Other']

export function BlockDocumentEditor({ slug, document: initialDoc, isOwner, onDocUpdated }: Props) {
  const [doc, setDoc] = useState(initialDoc)
  const [title, setTitle] = useState(initialDoc.title || '')
  const [icon, setIcon] = useState(initialDoc.icon || '📄')
  const [category, setCategory] = useState(initialDoc.category || 'General')
  const [visibility, setVisibility] = useState(initialDoc.visibility || 'venture_members')
  const [isPinned, setIsPinned] = useState(!!initialDoc.is_pinned)
  const [blocks, setBlocks] = useState<BlockData[]>(
    Array.isArray(initialDoc.content_blocks) && initialDoc.content_blocks.length > 0
      ? initialDoc.content_blocks
      : [{ id: 'blk_1', type: 'paragraph', content: '' }]
  )

  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'failed'>('saved')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync state with incoming updates
  useEffect(() => {
    setDoc(initialDoc)
    setTitle(initialDoc.title || '')
    setIcon(initialDoc.icon || '📄')
    setCategory(initialDoc.category || 'General')
    setVisibility(initialDoc.visibility || 'venture_members')
    setIsPinned(!!initialDoc.is_pinned)
    if (Array.isArray(initialDoc.content_blocks) && initialDoc.content_blocks.length > 0) {
      setBlocks(initialDoc.content_blocks)
    }
  }, [initialDoc])

  const saveDocument = useCallback(async (patchData?: Record<string, any>) => {
    if (!isOwner) return
    setSaving(true)
    setSaveStatus('saving')

    const payload = {
      title,
      icon,
      category,
      visibility,
      is_pinned: isPinned,
      content_blocks: blocks,
      ...patchData,
    }

    try {
      const res = await fetch(`/api/ventures/${slug}/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Autosave failed')

      setSaveStatus('saved')
      onDocUpdated(json.document)
    } catch (e: any) {
      console.error('Doc save error:', e)
      setSaveStatus('failed')
    } finally {
      setSaving(false)
    }
  }, [isOwner, title, icon, category, visibility, isPinned, blocks, slug, doc.id, onDocUpdated])

  const triggerAutosave = useCallback(() => {
    if (!isOwner) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      saveDocument()
    }, 1200)
  }, [isOwner, saveDocument])

  const handleUpdateBlock = (id: string, updatedPayload: Partial<BlockData>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updatedPayload } : b))
    triggerAutosave()
  }

  const handleAddBlock = (afterId?: string, type: BlockData['type'] = 'paragraph') => {
    const newBlock: BlockData = {
      id: `blk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      content: ''
    }
    setBlocks(prev => {
      if (!afterId) return [...prev, newBlock]
      const idx = prev.findIndex(b => b.id === afterId)
      if (idx === -1) return [...prev, newBlock]
      const next = [...prev]
      next.splice(idx + 1, 0, newBlock)
      return next
    })
    triggerAutosave()
  }

  const handleDeleteBlock = (id: string) => {
    if (blocks.length <= 1) return
    setBlocks(prev => prev.filter(b => b.id !== id))
    triggerAutosave()
  }

  // Fetch Version History Logs
  const loadVersionHistory = async () => {
    setLoadingVersions(true)
    setHistoryOpen(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/documents/${doc.id}/versions`)
      const json = await res.json()
      setVersions(json.versions || [])
    } catch {
      toast.error('Failed to load snapshot versions')
    } finally {
      setLoadingVersions(false)
    }
  }

  const restoreVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to restore to this snapshot?')) return
    try {
      const res = await fetch(`/api/ventures/${slug}/documents/${doc.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      toast.success('Document restored!')
      onDocUpdated(json.document)
      setHistoryOpen(false)
    } catch {
      toast.error('Could not restore snapshot version')
    }
  }

  // Open Centralised Image Asset Picker Modal
  const openMediaSelection = async (onSelect: (url: string, id: string, type: 'image' | 'video' | 'file') => void) => {
    try {
      const res = await fetch(`/api/ventures/${slug}/media`)
      const json = await res.json()
      const assets = json.assets || []

      if (assets.length === 0) {
        toast.error('No media assets found! Upload to the Media library first.')
        return
      }

      // Quick Prompt Selection
      const assetOptions = assets.map((a: any, i: number) => `${i + 1}. ${a.storage_path.split('/').pop()}`).join('\n')
      const selectionIdx = prompt(`Choose an asset index (1 to ${assets.length}):\n\n${assetOptions}`)

      if (selectionIdx) {
        const idx = parseInt(selectionIdx) - 1
        if (assets[idx]) {
          const matchedType = assets[idx].media_type === 'video' ? 'video' : 'image'
          onSelect(assets[idx].asset_url, assets[idx].id, matchedType)
        }
      }
    } catch {
      toast.error('Could not query venture media library.')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto">
      {/* Dynamic Header Tool Bar */}
      <div className="sticky top-0 z-20 border-b border-zinc-800 bg-[#09090b]/90 backdrop-blur px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const icons = ['📄', '📘', '🚀', '🔬', '⚙️', '💡', '🛡️', '📊']
              const nextIcon = icons[(icons.indexOf(icon) + 1) % icons.length]
              setIcon(nextIcon)
              triggerAutosave()
            }}
            disabled={!isOwner}
            className="text-xl p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Change Emoji"
          >
            {icon}
          </button>

          <select
            value={category}
            onChange={e => { setCategory(e.target.value); triggerAutosave(); }}
            disabled={!isOwner}
            className="bg-[#121215] border border-white/[0.06] text-[11.5px] font-semibold text-zinc-300 rounded px-2.5 py-1 focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={visibility}
            onChange={e => { setVisibility(e.target.value); triggerAutosave(); }}
            disabled={!isOwner}
            className="bg-[#121215] border border-white/[0.06] text-[11.5px] font-semibold text-zinc-300 rounded px-2.5 py-1 focus:outline-none"
          >
            <option value="public">Public</option>
            <option value="venture_members">Team Only</option>
            <option value="creator_only">Private</option>
          </select>
        </div>

        <div className="flex items-center gap-3 text-[11.5px] text-zinc-500">
          {saveStatus === 'saving' && (
            <span className="inline-flex items-center gap-1 text-zinc-400">
              <CircleNotch size={11} className="animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Check size={11} weight="bold" /> Saved
            </span>
          )}
          {saveStatus === 'failed' && (
            <span className="inline-flex items-center gap-1 text-red-400">
              Save Failed
            </span>
          )}

          <button
            onClick={loadVersionHistory}
            className="p-1.5 rounded border border-zinc-800 hover:text-white"
            title="Version Snapshots"
          >
            <ClockCounterClockwise size={13} />
          </button>

          {isOwner && (
            <button
              onClick={() => { setIsPinned(!isPinned); triggerAutosave(); }}
              className={
                'p-1.5 rounded border transition-colors ' +
                (isPinned ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'border-zinc-800 text-zinc-500 hover:text-white')
              }
              title="Pin Snapshot"
            >
              <PushPin size={13} weight={isPinned ? 'fill' : 'regular'} />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl w-full mx-auto px-6 py-10 space-y-6 flex-1">
        <input
          value={title}
          onChange={e => { setTitle(e.target.value); triggerAutosave(); }}
          readOnly={!isOwner}
          placeholder="Untitled Document"
          className="w-full bg-transparent text-[32px] font-bold text-white placeholder:text-zinc-700 focus:outline-none tracking-tight leading-tight"
        />

        {/* Multi-Block Parser Container */}
        <div className="space-y-2">
          {blocks.map((block) => (
            <DocumentBlockItem
              key={block.id}
              block={block}
              isOwner={isOwner}
              onUpdate={(updatedPayload) => handleUpdateBlock(block.id, updatedPayload)}
              onAddAfter={(type) => handleAddBlock(block.id, type)}
              onDelete={() => handleDeleteBlock(block.id)}
              onOpenMediaLibrary={openMediaSelection}
            />
          ))}
        </div>

        {isOwner && (
          <div className="pt-4 border-t border-zinc-800/60">
            <button
              onClick={() => handleAddBlock()}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 hover:text-white transition-colors"
            >
              <Plus size={13} weight="bold" /> Add block or type /
            </button>
          </div>
        )}
      </div>

      {/* History Slide Over */}
      {historyOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-[320px] bg-[#0c0c0f] border-l border-zinc-800 p-5 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-bold text-white flex items-center gap-1.5">
              <ClockCounterClockwise size={16} /> Document History
            </h3>
            <button onClick={() => setHistoryOpen(false)} className="text-zinc-500 hover:text-white text-[12px]">Close</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {loadingVersions ? (
              <p className="text-zinc-600 text-[12px]">Loading versions...</p>
            ) : versions.length === 0 ? (
              <p className="text-zinc-600 text-[12px] italic">No historic backups saved yet.</p>
            ) : (
              versions.map((ver) => (
                <div key={ver.id} className="p-3 bg-[#121215] rounded-xl border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-zinc-400">v{ver.version}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(ver.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-[12px] font-bold text-white truncate">{ver.title}</p>
                  <p className="text-[10px] text-zinc-500">Edited by {ver.editor?.full_name || 'System'}</p>
                  <button
                    onClick={() => restoreVersion(ver.id)}
                    className="w-full text-center text-[11px] py-1 bg-white text-black font-bold rounded-md hover:bg-zinc-200 transition-colors"
                  >
                    Restore Snapshot
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}