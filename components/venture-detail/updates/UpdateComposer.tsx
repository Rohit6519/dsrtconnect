'use client'

import { useState, useEffect } from 'react'
import { X, CircleNotch, Check, PaperPlaneRight, FileText } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { UpdateBlockEditor, UpdateBlock } from './UpdateBlockEditor'

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  existingUpdate?: any
  onSuccess: () => void
}

export function UpdateComposer({ open, onClose, slug, existingUpdate, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<UpdateBlock[]>([])
  const [visibility, setVisibility] = useState<'public' | 'venture_members'>('public')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    if (existingUpdate) {
      setTitle(existingUpdate.title || '')
      setBlocks(
        Array.isArray(existingUpdate.content_blocks) && existingUpdate.content_blocks.length > 0
          ? existingUpdate.content_blocks
          : [{ id: `blk_${Date.now()}`, type: 'paragraph', content: existingUpdate.content || '' }]
      )
      setVisibility(existingUpdate.visibility || 'public')
    } else {
      setTitle('')
      setBlocks([{ id: `blk_${Date.now()}`, type: 'paragraph', content: '' }])
      setVisibility('public')
    }
  }, [existingUpdate, open])

  if (!open) return null

  const isEditing = !!existingUpdate

  const saveOrPublish = async (status: 'draft' | 'published') => {
    const setter = status === 'draft' ? setSaving : setPublishing
    setter(true)

    try {
      const url = isEditing
        ? `/api/ventures/${slug}/updates/${existingUpdate.id}`
        : `/api/ventures/${slug}/updates`
      const method = isEditing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim() || null,
          content_blocks: blocks.filter(b => b.type === 'divider' || b.content.trim()),
          status,
          visibility,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to save')

      toast.success(
        status === 'draft'
          ? 'Draft saved'
          : isEditing ? 'Update saved' : 'Update published'
      )
      onSuccess()
      onClose()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save')
    } finally {
      setter(false)
    }
  }

  const hasContent = title.trim() || blocks.some(b => b.type === 'divider' || b.content.trim())

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0d0d10] border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div>
            <h2 className="text-[16px] font-bold text-white">
              {isEditing ? 'Edit update' : 'New update'}
            </h2>
            <p className="text-[11.5px] text-zinc-500 mt-0.5">
              Share progress, wins, and announcements with your audience
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Update title (optional)"
            maxLength={300}
            className="w-full bg-transparent text-[26px] font-bold text-white placeholder:text-zinc-700 focus:outline-none tracking-tight leading-tight mb-6"
          />

          <div className="ml-8">
            <UpdateBlockEditor blocks={blocks} onChange={setBlocks} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <select
              value={visibility}
              onChange={e => setVisibility(e.target.value as 'public' | 'venture_members')}
              className="h-9 px-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-lg text-[12px] font-semibold text-zinc-300 focus:outline-none focus:border-zinc-600"
            >
              <option value="public">🌐 Public</option>
              <option value="venture_members">👥 Team only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => saveOrPublish('draft')}
              disabled={!hasContent || saving || publishing}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-white/[0.03] text-[12.5px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
            >
              {saving ? (
                <><CircleNotch size={12} className="animate-spin" /> Saving…</>
              ) : (
                <><FileText size={12} /> Save draft</>
              )}
            </button>
            <button
              onClick={() => saveOrPublish('published')}
              disabled={!hasContent || saving || publishing}
              className="inline-flex items-center gap-1.5 h-9 px-5 bg-white text-black rounded-lg text-[12.5px] font-bold hover:bg-zinc-100 disabled:opacity-50 transition-colors"
            >
              {publishing ? (
                <><CircleNotch size={12} className="animate-spin" /> Publishing…</>
              ) : isEditing ? (
                <><Check size={13} weight="bold" /> Save changes</>
              ) : (
                <><PaperPlaneRight size={13} weight="fill" /> Publish</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}