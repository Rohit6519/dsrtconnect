'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RichEditorLite } from '../shared/RichEditorLite'
import type { MediaItem } from './MediaCarousel'
import { cn } from '@/lib/utils'
import {
  X, Check, Image as ImageIcon, VideoCamera, FilePdf, File as FileIcon,
  Trash, Spinner, Eye, PencilSimple,
} from '@phosphor-icons/react'

interface FeaturedWorkEntry {
  id?: string
  title: string
  description_html?: string | null
  media?: MediaItem[]
}

interface FeaturedWorkEditorProps {
  entry: FeaturedWorkEntry | null
  onSave: (saved: any) => void
  onCancel: () => void
  inline?: boolean   // ← ADDED
}

const MAX_MEDIA = 20
const MAX_DESC = 10000

function getVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => { resolve(video.duration || null); URL.revokeObjectURL(video.src) }
    video.onerror = () => resolve(null)
    video.src = URL.createObjectURL(file)
  })
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export function FeaturedWorkEditor({ entry, onSave, onCancel, inline = false }: FeaturedWorkEditorProps) {
  const isEdit = !!entry?.id
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const allInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState(entry?.title || '')
  const [descHtml, setDescHtml] = useState(entry?.description_html || '')
  const [media, setMedia] = useState<MediaItem[]>(entry?.media || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'write' | 'preview'>('write')

  const descLen = stripHtml(descHtml).length

  // ── Media upload ─────────────────────────────────────────────────────
  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return
    if (media.length + files.length > MAX_MEDIA) {
      toast.error(`Max ${MAX_MEDIA} media items`)
      return
    }
    setUploading(true)
    const newMedia: MediaItem[] = []

    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file)
      let duration: number | null = null
      if (file.type.startsWith('video/')) duration = await getVideoDuration(file)

      try {
        const res = await fetch('/api/profile/featured-work/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          toast.error(`${file.name}: ${err.error}`)
          continue
        }
        const data = await res.json()
        newMedia.push({
          media_type: data.media_type,
          url: data.url,
          filename: data.filename,
          file_size: data.file_size,
          duration_seconds: duration,
        })
      } catch {
        toast.error(`Failed to upload ${file.name}`)
      }
    }

    if (newMedia.length > 0) {
      if (isEdit && entry?.id) {
        const persisted: MediaItem[] = []
        for (const m of newMedia) {
          try {
            const res = await fetch(`/api/profile/featured-work/${entry.id}/media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(m),
            })
            if (res.ok) {
              const data = await res.json()
              persisted.push(data.media)
            }
          } catch {}
        }
        setMedia((cur) => [...cur, ...persisted])
      } else {
        setMedia((cur) => [...cur, ...newMedia])
      }
      toast.success(`${newMedia.length} file(s) uploaded`)
    }

    setUploading(false)
  }

  const removeMedia = async (index: number) => {
    const m = media[index]
    if (isEdit && entry?.id && m.id) {
      try {
        const res = await fetch(`/api/profile/featured-work/${entry.id}/media/${m.id}`, { method: 'DELETE' })
        if (!res.ok) { toast.error('Failed to remove'); return }
      } catch { toast.error('Failed to remove'); return }
    }
    setMedia((cur) => cur.filter((_, i) => i !== index))
  }

  const save = async () => {
    if (!title.trim()) { toast.error('Title required'); return }
    setSaving(true)
    try {
      if (isEdit && entry?.id) {
        const res = await fetch(`/api/profile/featured-work/${entry.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description_html: descHtml.trim() || null }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
        const data = await res.json()
        onSave(data.work)
        toast.success('Work updated')
      } else {
        const res = await fetch('/api/profile/featured-work', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title.trim(), description_html: descHtml.trim() || null, media }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Failed')
        const data = await res.json()
        onSave(data.work)
        toast.success('Work added')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const primaryMedia = media[0]

  // ── Inline mode: no fixed backdrop, just the modal content directly ──
  if (inline) {
    return (
      <div className="bg-zinc-950 overflow-hidden flex flex-col w-full" style={{ minHeight: '640px' }}>
        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = '' }} />
        <input ref={videoInputRef} type="file" multiple accept="video/*" className="hidden"
          onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = '' }} />
        <input ref={allInputRef} type="file" multiple
          accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
          className="hidden"
          onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = '' }} />

        {/* Title bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60 flex-shrink-0 bg-zinc-950">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled work"
            maxLength={200}
            className="flex-1 bg-transparent text-[18px] font-bold text-white tracking-tight placeholder:text-zinc-600 focus:outline-none"
          />
        </div>

        {/* Body — 2 columns (same as modal) */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* LEFT: Media panel */}
          <div className="w-full md:w-[42%] flex-shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/60 flex flex-col bg-black min-h-[280px]">
            <div className="flex-1 min-h-[240px] flex items-center justify-center relative">
              {primaryMedia ? (
                <>
                  {primaryMedia.media_type === 'image' && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={primaryMedia.url} alt="" className="max-w-full max-h-full object-contain" />
                  )}
                  {primaryMedia.media_type === 'video' && (
                    <video src={primaryMedia.url} controls className="max-w-full max-h-full" />
                  )}
                  {primaryMedia.media_type === 'pdf' && (
                    <div className="flex flex-col items-center gap-2 p-5">
                      <FilePdf className="w-14 h-14 text-red-400" weight="duotone" />
                      <p className="text-[12px] text-zinc-300 text-center break-all max-w-[80%]">{primaryMedia.filename}</p>
                    </div>
                  )}
                  {primaryMedia.media_type === 'attachment' && (
                    <div className="flex flex-col items-center gap-2 p-5">
                      <FileIcon className="w-14 h-14 text-zinc-400" weight="duotone" />
                      <p className="text-[12px] text-zinc-300 text-center break-all max-w-[80%]">{primaryMedia.filename}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6">
                  <ImageIcon className="w-10 h-10 text-zinc-700" weight="duotone" />
                  <p className="text-[13px] text-zinc-500 text-center">
                    Add images and videos to showcase this work.
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[12px] font-semibold hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" weight="fill" />
                      Image
                    </button>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[12px] font-semibold hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      <VideoCamera className="w-3.5 h-3.5" weight="fill" />
                      Video
                    </button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5">
                    <Spinner className="w-3.5 h-3.5 text-white animate-spin" weight="bold" />
                    <span className="text-[11px] text-zinc-200">Uploading...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="border-t border-zinc-800/60 p-2 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 bg-zinc-950/60 min-h-[64px]">
              {media.map((m, i) => (
                <div key={m.id || i} className="relative group flex-shrink-0">
                  <div className="w-12 h-12 rounded-md overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                    {m.media_type === 'image' && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {m.media_type === 'video' && <VideoCamera className="w-5 h-5 text-zinc-500" weight="duotone" />}
                    {m.media_type === 'pdf' && <FilePdf className="w-5 h-5 text-red-400" weight="duotone" />}
                    {m.media_type === 'attachment' && <FileIcon className="w-5 h-5 text-zinc-500" weight="duotone" />}
                  </div>
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Remove"
                  >
                    <X className="w-2 h-2" weight="bold" />
                  </button>
                </div>
              ))}

              {media.length < MAX_MEDIA && (
                <>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="w-12 h-12 rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Add images"
                  >
                    <ImageIcon className="w-4 h-4" weight="duotone" />
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploading}
                    className="w-12 h-12 rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Add videos"
                  >
                    <VideoCamera className="w-4 h-4" weight="duotone" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* RIGHT: Description panel */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-950">
            <div className="flex items-center gap-1 p-2 border-b border-zinc-800/60 flex-shrink-0">
              <button
                onClick={() => setMode('write')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition-colors',
                  mode === 'write' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <PencilSimple className="w-3 h-3" weight="bold" />
                Write
              </button>
              <button
                onClick={() => setMode('preview')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition-colors',
                  mode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Eye className="w-3 h-3" weight="bold" />
                Preview
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {mode === 'write' ? (
                <div className="p-3 h-full">
                  <RichEditorLite
                    value={descHtml}
                    onChange={setDescHtml}
                    placeholder="Describe this work in detail. What does it do? How does it work? What makes it special?"
                    toolbar="full"
                    minHeight="320px"
                    className="border-0 bg-transparent"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'p-5 text-[14px] text-zinc-300 leading-[1.7]',
                    '[&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-white',
                    '[&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-white',
                    '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-white',
                    '[&_p]:my-2',
                    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1',
                    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1',
                    '[&_strong]:text-white [&_strong]:font-bold',
                    '[&_a]:text-blue-400 [&_a]:underline',
                    '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400',
                    '[&_img]:rounded-lg [&_img]:my-3 [&_img]:max-w-full',
                  )}
                  dangerouslySetInnerHTML={{ __html: descHtml || '<p class="text-zinc-600 italic">Nothing to preview yet.</p>' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-zinc-800/60 bg-zinc-950 flex-shrink-0">
          <span className="text-[11px] text-zinc-600">
            {descLen.toLocaleString()} / {MAX_DESC.toLocaleString()} · Rich text supported
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" onClick={onCancel} disabled={saving || uploading}
              className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200 h-9"
            >
              Clear
            </Button>
            <Button
              onClick={save} disabled={saving || uploading}
              className="bg-white text-black hover:bg-zinc-100 min-w-[100px] h-9"
            >
              {saving ? 'Saving...' : <><Check className="w-4 h-4 mr-1.5" weight="bold" />Save First Work</>}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ── Modal mode: original wrapper (fixed backdrop) ─────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saving && !uploading) onCancel() }}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-6xl overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
        style={{ maxHeight: 'calc(100vh - 1rem)' }}
      >
        {/* Hidden file inputs */}
        <input ref={imageInputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = '' }} />
        <input ref={videoInputRef} type="file" multiple accept="video/*" className="hidden"
          onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = '' }} />
        <input ref={allInputRef} type="file" multiple
          accept="image/*,video/*,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip"
          className="hidden"
          onChange={(e) => { handleFilesSelected(Array.from(e.target.files || [])); e.target.value = '' }} />

        {/* Inline title bar (LinkedIn article style) */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-zinc-800/60 flex-shrink-0 bg-zinc-950">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled work"
            maxLength={200}
            className="flex-1 bg-transparent text-[18px] font-bold text-white tracking-tight placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            onClick={onCancel}
            disabled={saving || uploading}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>

        {/* Body — 2 columns */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">

          {/* ─── LEFT: Media panel ────────────────────────────── */}
          <div className="w-full md:w-[42%] flex-shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/60 flex flex-col bg-black min-h-[280px]">
            {/* Main media preview area */}
            <div className="flex-1 min-h-[240px] flex items-center justify-center relative">
              {primaryMedia ? (
                <>
                  {primaryMedia.media_type === 'image' && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryMedia.url} alt="" className="max-w-full max-h-full object-contain" />
                  )}
                  {primaryMedia.media_type === 'video' && (
                    <video src={primaryMedia.url} controls className="max-w-full max-h-full" />
                  )}
                  {primaryMedia.media_type === 'pdf' && (
                    <div className="flex flex-col items-center gap-2 p-5">
                      <FilePdf className="w-14 h-14 text-red-400" weight="duotone" />
                      <p className="text-[12px] text-zinc-300 text-center break-all max-w-[80%]">{primaryMedia.filename}</p>
                    </div>
                  )}
                  {primaryMedia.media_type === 'attachment' && (
                    <div className="flex flex-col items-center gap-2 p-5">
                      <FileIcon className="w-14 h-14 text-zinc-400" weight="duotone" />
                      <p className="text-[12px] text-zinc-300 text-center break-all max-w-[80%]">{primaryMedia.filename}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6">
                  <ImageIcon className="w-10 h-10 text-zinc-700" weight="duotone" />
                  <p className="text-[13px] text-zinc-500 text-center">
                    Add images and videos to showcase this work.
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[12px] font-semibold hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5" weight="fill" />
                      Image
                    </button>
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploading}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 text-[12px] font-semibold hover:border-zinc-700 hover:text-white transition-colors"
                    >
                      <VideoCamera className="w-3.5 h-3.5" weight="fill" />
                      Video
                    </button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-3 py-1.5">
                    <Spinner className="w-3.5 h-3.5 text-white animate-spin" weight="bold" />
                    <span className="text-[11px] text-zinc-200">Uploading...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="border-t border-zinc-800/60 p-2 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 bg-zinc-950/60 min-h-[64px]">
              {media.map((m, i) => (
                <div key={m.id || i} className="relative group flex-shrink-0">
                  <div className="w-12 h-12 rounded-md overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                    {m.media_type === 'image' && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" className="w-full h-full object-cover" />
                    )}
                    {m.media_type === 'video' && <VideoCamera className="w-5 h-5 text-zinc-500" weight="duotone" />}
                    {m.media_type === 'pdf' && <FilePdf className="w-5 h-5 text-red-400" weight="duotone" />}
                    {m.media_type === 'attachment' && <FileIcon className="w-5 h-5 text-zinc-500" weight="duotone" />}
                  </div>
                  <button
                    onClick={() => removeMedia(i)}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Remove"
                  >
                    <X className="w-2 h-2" weight="bold" />
                  </button>
                </div>
              ))}

              {media.length < MAX_MEDIA && (
                <>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploading}
                    className="w-12 h-12 rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Add images"
                  >
                    <ImageIcon className="w-4 h-4" weight="duotone" />
                  </button>
                  <button
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploading}
                    className="w-12 h-12 rounded-md border border-dashed border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 flex items-center justify-center flex-shrink-0 transition-colors"
                    title="Add videos"
                  >
                    <VideoCamera className="w-4 h-4" weight="duotone" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ─── RIGHT: Description panel ─────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-950">
            {/* Write / Preview toggle */}
            <div className="flex items-center gap-1 p-2 border-b border-zinc-800/60 flex-shrink-0">
              <button
                onClick={() => setMode('write')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition-colors',
                  mode === 'write' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <PencilSimple className="w-3 h-3" weight="bold" />
                Write
              </button>
              <button
                onClick={() => setMode('preview')}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11.5px] font-semibold transition-colors',
                  mode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300',
                )}
              >
                <Eye className="w-3 h-3" weight="bold" />
                Preview
              </button>
            </div>

            {/* Editor / Preview body */}
            <div className="flex-1 overflow-y-auto">
              {mode === 'write' ? (
                <div className="p-3 h-full">
                  <RichEditorLite
                    value={descHtml}
                    onChange={setDescHtml}
                    placeholder="Describe this work in detail. What does it do? How does it work? What makes it special?"
                    toolbar="full"
                    minHeight="320px"
                    className="border-0 bg-transparent"
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'p-5 text-[14px] text-zinc-300 leading-[1.7]',
                    '[&_h1]:text-[20px] [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-white',
                    '[&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-white',
                    '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-white',
                    '[&_p]:my-2',
                    '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1',
                    '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1',
                    '[&_strong]:text-white [&_strong]:font-bold',
                    '[&_a]:text-blue-400 [&_a]:underline',
                    '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400',
                    '[&_img]:rounded-lg [&_img]:my-3 [&_img]:max-w-full',
                  )}
                  dangerouslySetInnerHTML={{ __html: descHtml || '<p class="text-zinc-600 italic">Nothing to preview yet.</p>' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-zinc-800/60 bg-zinc-950 flex-shrink-0">
          <span className="text-[11px] text-zinc-600">
            {descLen.toLocaleString()} / {MAX_DESC.toLocaleString()} · Rich text supported
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" onClick={onCancel} disabled={saving || uploading}
              className="border-zinc-700 bg-transparent text-zinc-400 hover:text-zinc-200 h-9"
            >
              Cancel
            </Button>
            <Button
              onClick={save} disabled={saving || uploading}
              className="bg-white text-black hover:bg-zinc-100 min-w-[100px] h-9"
            >
              {saving ? 'Saving...' : <><Check className="w-4 h-4 mr-1.5" weight="bold" />Save</>}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}