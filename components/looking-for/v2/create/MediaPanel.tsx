'use client'

import { useState, useRef } from 'react'
import { Image as ImageIcon, VideoCamera, Paperclip, X, ArrowsOutSimple } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  draft: any
  onUpdate: (patch: any) => void
}

interface MediaItem {
  id: string
  type: 'image' | 'video' | 'file'
  url: string
  filename?: string
  size?: number
}

export function MediaPanel({ draft, onUpdate }: Props) {
  const supabase = createClient()
  const [media, setMedia] = useState<MediaItem[]>(() => {
    // Extract media from content_blocks
    const blocks = draft?.content_blocks || []
    return blocks
      .filter((b: any) => b.type === 'image' || b.type === 'video' || b.type === 'file')
      .map((b: any) => ({
        id: b.id,
        type: b.type,
        url: b.url || '',
        filename: b.meta?.filename,
        size: b.meta?.size,
      }))
  })
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const path = `opportunities/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

      const { data, error: upErr } = await supabase.storage
        .from('opportunity-media')
        .upload(path, file, { upsert: false })

      if (upErr) {
        // Fallback: try public-media bucket
        const { data: fbData, error: fbErr } = await supabase.storage
          .from('public-media')
          .upload(path, file, { upsert: false })
        if (fbErr) throw fbErr
        const { data: urlData } = supabase.storage.from('public-media').getPublicUrl(path)
        return urlData.publicUrl
      }

      const { data: urlData } = supabase.storage.from('opportunity-media').getPublicUrl(path)
      return urlData.publicUrl
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
      throw e
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    for (const file of files) {
      try {
        const url = await uploadFile(file)
        const newItem: MediaItem = {
          id: 'med_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          type,
          url,
          filename: file.name,
          size: file.size,
        }
        const nextMedia = [...media, newItem]
        setMedia(nextMedia)

        // Append to content blocks as a new image/video block
        const currentBlocks = draft?.content_blocks || []
        const nextBlocks = [
          ...currentBlocks,
          {
            id: newItem.id,
            type: newItem.type,
            url: newItem.url,
            content: '',
            meta: { filename: file.name, size: file.size },
          },
        ]
        onUpdate({ content_blocks: nextBlocks })
      } catch { }
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  const removeMedia = (id: string) => {
    setMedia(prev => prev.filter(m => m.id !== id))
    const currentBlocks = draft?.content_blocks || []
    onUpdate({ content_blocks: currentBlocks.filter((b: any) => b.id !== id) })
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 shadow-[0_2px_16px_rgba(0,0,0,0.3)]">
      <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
        Media
      </h3>

      {media.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-800 py-8 px-3 text-center mb-3">
          <ImageIcon size={20} className="mx-auto mb-2 text-zinc-600" />
          <p className="text-[11.5px] text-zinc-500 leading-relaxed">
            Add images, videos, or attachments to showcase this opportunity.
          </p>
        </div>
      ) : (
        <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
          {media.map(m => (
            <div key={m.id} className="group relative rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
              {m.type === 'image' ? (
                <div className="relative aspect-video bg-zinc-900">
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                </div>
              ) : m.type === 'video' ? (
                <div className="relative aspect-video bg-zinc-900 flex items-center justify-center">
                  <VideoCamera size={24} className="text-zinc-500" />
                </div>
              ) : (
                <div className="p-3 flex items-center gap-2">
                  <Paperclip size={12} className="text-zinc-500 shrink-0" />
                  <span className="text-[11.5px] text-zinc-300 truncate flex-1">{m.filename}</span>
                </div>
              )}
              <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={m.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-6 h-6 rounded bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-black/90"
                >
                  <ArrowsOutSimple size={11} weight="bold" />
                </a>
                <button
                  onClick={() => removeMedia(m.id)}
                  className="w-6 h-6 rounded bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-red-500/80"
                >
                  <X size={11} weight="bold" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      <div className="space-y-1.5">
        <UploadButton
          Icon={ImageIcon}
          label="Image"
          accept="image/*"
          onSelect={(e) => handleFileSelect(e, 'image')}
          disabled={uploading}
        />
        <UploadButton
          Icon={VideoCamera}
          label="Video"
          accept="video/*"
          onSelect={(e) => handleFileSelect(e, 'video')}
          disabled={uploading}
        />
        <UploadButton
          Icon={Paperclip}
          label="Attach"
          accept="*"
          onSelect={(e) => handleFileSelect(e, 'file')}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="mt-3 text-[11px] text-zinc-500 text-center">
          Uploading...
        </div>
      )}
      {error && (
        <div className="mt-3 text-[11px] text-red-400 text-center">
          {error}
        </div>
      )}

      <input ref={inputRef} type="file" className="hidden" />
    </div>
  )
}

function UploadButton({
  Icon, label, accept, onSelect, disabled,
}: {
  Icon: any
  label: string
  accept: string
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}) {
  return (
    <label className={
      'flex items-center gap-2 h-9 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer transition-colors ' +
      (disabled ? 'opacity-50 cursor-not-allowed' : '')
    }>
      <Icon size={13} weight="regular" className="text-zinc-400" />
      <span className="text-[12px] font-medium text-zinc-300">{label}</span>
      <input
        type="file"
        accept={accept}
        onChange={onSelect}
        disabled={disabled}
        className="hidden"
      />
    </label>
  )
}