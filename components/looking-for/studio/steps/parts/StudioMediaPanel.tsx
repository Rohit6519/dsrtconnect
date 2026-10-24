'use client'

import { useState } from 'react'
import { useStudio } from '../../StudioContext'
import { Image as ImageIcon, FileText, Trash, UploadSimple, CircleNotch } from '@phosphor-icons/react'

export function StudioMediaPanel() {
  const { draft, setDraft } = useStudio()
  const [uploading, setUploading] = useState(false)
  const oppId = draft.opportunity.id
  const media = draft.media || []

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/opportunities/drafts/${oppId}/media`, {
        method: 'POST',
        body: formData
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Upload failed')

      setDraft(prev => prev ? { ...prev, media: [...prev.media, d.media] } : prev)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (mediaId: string) => {
    // Optimistic UI update
    const previous = media
    setDraft(prev => prev ? { ...prev, media: prev.media.filter((m: any) => m.id !== mediaId) } : prev)
    
    try {
      const res = await fetch(`/api/opportunities/drafts/${oppId}/media/${mediaId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    } catch (err) {
      // Rollback
      setDraft(prev => prev ? { ...prev, media: previous } : prev)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex items-center justify-between mb-4">
        <label className="text-[13px] font-bold text-white">Media & Attachments</label>
        <span className="text-[11px] text-zinc-500">{media.length}/5 files</span>
      </div>

      <div className="space-y-3">
        {media.map((m: any) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800/60 bg-zinc-950/40">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center shrink-0">
              {m.media_type === 'image' ? (
                <img src={m.url} className="w-full h-full object-cover rounded-lg" alt="" />
              ) : (
                <FileText size={16} className="text-zinc-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-zinc-200 truncate">{m.filename}</div>
              <div className="text-[10.5px] text-zinc-500">{(m.size_bytes / 1024 / 1024).toFixed(2)} MB</div>
            </div>
            <button
              onClick={() => handleDelete(m.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}

        {media.length < 5 && (
          <label className={
            'flex flex-col items-center justify-center h-28 rounded-xl border border-dashed border-zinc-700 bg-zinc-950/30 hover:bg-zinc-900/50 transition-colors cursor-pointer ' +
            (uploading ? 'opacity-50 pointer-events-none' : '')
          }>
            <input type="file" className="hidden" onChange={handleUpload} accept="image/*,.pdf,.doc,.docx" disabled={uploading} />
            {uploading ? (
              <CircleNotch size={20} className="text-zinc-400 animate-spin mb-2" />
            ) : (
              <UploadSimple size={20} className="text-zinc-500 mb-2" />
            )}
            <span className="text-[12.5px] font-semibold text-zinc-300">
              {uploading ? 'Uploading...' : 'Click to upload'}
            </span>
            <span className="text-[11px] text-zinc-600 mt-1">Images or PDFs up to 10MB</span>
          </label>
        )}
      </div>
    </div>
  )
}