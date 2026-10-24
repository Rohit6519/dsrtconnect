'use client'

import { useState, useEffect } from 'react'
import { X, CircleNotch, Check, PencilSimple, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { MediaImageCropper } from './MediaImageCropper'

interface Props {
  open: boolean
  onClose: () => void
  slug: string
  asset: any
  onSuccess: () => void
}

export function MediaEditorModal({ open, onClose, slug, asset, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [altText, setAltText] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [cropperOpen, setCropperOpen] = useState(false)

  useEffect(() => {
    if (asset) {
      setTitle(asset.title || '')
      setDescription(asset.description || '')
      setAltText(asset.alt_text || '')
      setVisibility(asset.visibility || 'public')
      setTags(asset.tags || [])
    }
  }, [asset])

  if (!open || !asset) return null

  const isImage = asset.media_type === 'image'

  const handleAddTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-')
    if (clean && !tags.includes(clean) && tags.length < 20) {
      setTags([...tags, clean])
      setTagInput('')
    }
  }

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(x => x !== t))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/ventures/${slug}/media/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          alt_text: altText.trim() || null,
          tags,
          visibility,
        })
      })

      if (!res.ok) throw new Error('Failed to save')
      toast.success('Metadata updated')
      onSuccess()
      onClose()
    } catch {
      toast.error('Failed to update asset')
    } finally {
      setSaving(false)
    }
  }

  const handleCropSave = async (cropMetadata: any) => {
    const res = await fetch(`/api/ventures/${slug}/media/${asset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crop_metadata: cropMetadata })
    })
    if (!res.ok) throw new Error('Failed to save crop')
    onSuccess()
  }

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#0d0d10] border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-white">Edit Media Details</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={16} /></button>
          </div>

          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Preview + edit crop */}
            <div className="rounded-lg overflow-hidden bg-black relative aspect-video border border-zinc-800">
              {isImage ? (
                <img src={asset.asset_url} alt="" className="w-full h-full object-contain" />
              ) : asset.media_type === 'video' ? (
                <video src={asset.asset_url} controls className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                  {asset.title || 'Document'}
                </div>
              )}

              {isImage && (
                <button
                  onClick={() => setCropperOpen(true)}
                  className="absolute top-2 right-2 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black/70 backdrop-blur border border-white/20 hover:bg-black text-[11.5px] font-semibold text-white transition-colors"
                >
                  <PencilSimple size={12} /> Edit crop
                </button>
              )}
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-white mb-1">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                className="w-full h-10 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-white mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full p-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-white mb-1">Alt Text (Accessibility)</label>
              <input
                value={altText}
                onChange={e => setAltText(e.target.value)}
                maxLength={200}
                placeholder="Describe for screen readers"
                className="w-full h-10 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-white mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[11px] font-semibold text-zinc-300">
                    {t}
                    <button onClick={() => handleRemoveTag(t)} className="text-zinc-500 hover:text-red-400 ml-0.5">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  placeholder="Add tag (e.g. product, demo, screenshot)"
                  className="flex-1 h-8 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[12px] text-white focus:outline-none focus:border-zinc-600"
                />
                <button
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 20}
                  className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-[11.5px] font-semibold text-zinc-300 disabled:opacity-50"
                >
                  <Plus size={11} weight="bold" /> Add
                </button>
              </div>
              <p className="text-[10.5px] text-zinc-600 mt-1">Up to 20 tags · Lowercase, hyphens allowed</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-white mb-1">Visibility</label>
              <select
                value={visibility}
                onChange={e => setVisibility(e.target.value)}
                className="w-full h-10 px-3 bg-[#09090b] border border-zinc-800 rounded-lg text-[13px] text-white focus:outline-none focus:border-zinc-600"
              >
                <option value="public">Public — Visible to everyone</option>
                <option value="venture_members">Team Only — Members & founders</option>
                <option value="creator_only">Private — Only me</option>
              </select>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-zinc-800 bg-zinc-900/30 flex justify-end gap-2">
            <button onClick={onClose} className="px-4 h-9 text-[12.5px] font-semibold text-zinc-400 hover:text-white">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 h-9 bg-white text-black rounded-lg text-[12.5px] font-bold hover:bg-zinc-100 disabled:opacity-50"
            >
              {saving ? <CircleNotch size={13} className="animate-spin" /> : <><Check size={13} weight="bold" /> Save changes</>}
            </button>
          </div>
        </div>
      </div>

      {cropperOpen && isImage && (
        <MediaImageCropper
          open={cropperOpen}
          onClose={() => setCropperOpen(false)}
          imageUrl={asset.asset_url}
          initialCrop={asset.crop_metadata}
          onSave={handleCropSave}
        />
      )}
    </>
  )
}