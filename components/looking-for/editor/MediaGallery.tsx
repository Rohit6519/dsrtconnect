'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ImageSquare, VideoCamera, Paperclip, X, PencilSimple,
  Check, CircleNotch, Warning, DownloadSimple,
  FilePdf, FileDoc, FileXls, FileZip, File as FileIcon,
} from '@phosphor-icons/react'
import { CaptionEditor } from './CaptionEditor'

export interface MediaItem {
  id: string
  type: 'image' | 'video' | 'file'
  url: string
  thumbnail_url: string | null
  caption: string | null
  caption_html: string | null
  description: string | null
  position: number
  file_name?: string | null
  file_extension?: string | null
  file_size?: number | null
  mime_type?: string | null
}

interface Props {
  draftId: string | null
  onDraftNeeded: () => Promise<string | null>
}

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'
const FILE_ACCEPT  = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.md,.csv,.json,.rtf,.odt,.ods,.odp'

export function MediaGallery({ draftId, onDraftNeeded }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState<'image' | 'video' | 'file' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/looking-for/drafts/${id}/media`)
      const data = await res.json()
      setItems(data.media || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (draftId) load(draftId)
  }, [draftId, load])

  const handleUpload = async (file: File, type: 'image' | 'video' | 'file') => {
    setError(null)
    setUploading(type)
    let effectiveDraftId = draftId
    if (!effectiveDraftId) {
      effectiveDraftId = await onDraftNeeded()
      if (!effectiveDraftId) {
        setError('Add a title first to enable uploads.')
        setUploading(null)
        return
      }
    }
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadRes = await fetch('/api/looking-for/drafts/upload-media', { method: 'POST', body: fd })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed')

      const createRes = await fetch(`/api/looking-for/drafts/${effectiveDraftId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: uploadData.type,
          url: uploadData.url,
          mime_type: uploadData.mime_type,
          file_size: uploadData.size,
          file_name: uploadData.file_name,
          file_extension: uploadData.file_extension,
        }),
      })
      const createData = await createRes.json()
      if (!createRes.ok) throw new Error(createData.error || 'Failed to save')
      setItems(prev => [...prev, createData.media])
      setExpandedId(createData.media.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(null)
    }
  }

  const onFileChange = (ref: React.RefObject<HTMLInputElement>, type: 'image' | 'video' | 'file') =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleUpload(file, type)
      if (ref.current) ref.current.value = ''
    }

  const updateItem = async (id: string, patch: Partial<MediaItem>) => {
    if (!draftId) return
    setItems(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
    try {
      await fetch(`/api/looking-for/drafts/${draftId}/media/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch { /* ignore */ }
  }

  const removeItem = async (id: string) => {
    if (!draftId) return
    if (!confirm('Remove this item?')) return
    setItems(prev => prev.filter(m => m.id !== id))
    if (expandedId === id) setExpandedId(null)
    try {
      await fetch(`/api/looking-for/drafts/${draftId}/media/${id}`, { method: 'DELETE' })
    } catch { /* ignore */ }
  }

  const hasItems = items.length > 0

  return (
    <div className="flex flex-col">
      <input ref={imageInputRef} type="file" accept={IMAGE_ACCEPT} onChange={onFileChange(imageInputRef, 'image')} className="hidden" />
      <input ref={videoInputRef} type="file" accept={VIDEO_ACCEPT} onChange={onFileChange(videoInputRef, 'video')} className="hidden" />
      <input ref={fileInputRef}  type="file" accept={FILE_ACCEPT}  onChange={onFileChange(fileInputRef,  'file')}  className="hidden" />

      {!hasItems && !loading && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden mb-3">
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <div className="w-14 h-14 rounded-lg border border-zinc-800 bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4">
              <ImageSquare size={22} weight="regular" />
            </div>
            <p className="text-[13px] text-zinc-400 leading-relaxed max-w-xs">
              Add images, videos, or attachments to showcase this opportunity.
            </p>
          </div>
        </div>
      )}

      {hasItems && (
        <div className="space-y-3 mb-3">
          {items.map((item, i) => (
            <MediaCard
              key={item.id}
              item={item}
              index={i}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <UploadBtn Icon={ImageSquare} label="Image" onClick={() => imageInputRef.current?.click()} uploading={uploading === 'image'} disabled={uploading !== null} />
        <UploadBtn Icon={VideoCamera} label="Video" onClick={() => videoInputRef.current?.click()} uploading={uploading === 'video'} disabled={uploading !== null} />
        <UploadBtn Icon={Paperclip}   label="Attach" onClick={() => fileInputRef.current?.click()} uploading={uploading === 'file'}  disabled={uploading !== null} />
      </div>

      {error && (
        <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-md border border-red-500/40 bg-red-500/5 text-[11.5px] text-red-400">
          <Warning size={12} weight="fill" className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

function UploadBtn({
  Icon, label, onClick, uploading, disabled,
}: {
  Icon: any
  label: string
  onClick: () => void
  uploading: boolean
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 bg-zinc-950 hover:bg-zinc-900 text-zinc-200 text-[12.5px] font-semibold disabled:opacity-40 transition-colors"
    >
      {uploading ? (
        <>
          <CircleNotch size={12} className="animate-spin" />
          <span className="hidden sm:inline">Uploading</span>
        </>
      ) : (
        <>
          <Icon size={13} weight="regular" />
          {label}
        </>
      )}
    </button>
  )
}

function fileIconFor(ext: string | null | undefined) {
  const e = (ext || '').toLowerCase()
  if (['pdf'].includes(e)) return { Icon: FilePdf, color: 'text-red-400', bg: 'bg-red-500/10' }
  if (['doc', 'docx', 'odt', 'rtf'].includes(e)) return { Icon: FileDoc, color: 'text-blue-400', bg: 'bg-blue-500/10' }
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return { Icon: FileXls, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  if (['zip', '7z', 'tar', 'gz'].includes(e)) return { Icon: FileZip, color: 'text-amber-400', bg: 'bg-amber-500/10' }
  return { Icon: FileIcon, color: 'text-zinc-400', bg: 'bg-zinc-900' }
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function MediaCard({
  item, index, expanded, onToggle, onUpdate, onRemove,
}: {
  item: MediaItem
  index: number
  expanded: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<MediaItem>) => void
  onRemove: () => void
}) {
  return (
    <div className={
      'rounded-lg border overflow-hidden transition-colors ' +
      (expanded ? 'border-zinc-700 bg-zinc-950' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700')
    }>
      <div className="relative group">
        {item.type === 'image' && (
          <div className="relative aspect-video bg-zinc-950 cursor-pointer" onClick={onToggle}>
            <Image src={item.url} alt={item.caption || ''} fill className="object-cover" sizes="300px" />
          </div>
        )}

        {item.type === 'video' && (
          <div className="relative aspect-video bg-zinc-950 cursor-pointer" onClick={onToggle}>
            <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur flex items-center justify-center">
                <VideoCamera size={14} weight="fill" className="text-white" />
              </div>
            </div>
          </div>
        )}

        {item.type === 'file' && (() => {
          const meta = fileIconFor(item.file_extension)
          return (
            <div className="cursor-pointer" onClick={onToggle}>
              <div className="flex items-center gap-3 p-3.5 bg-zinc-950">
                <div className={'w-11 h-11 rounded-md flex items-center justify-center shrink-0 ' + meta.bg + ' ' + meta.color}>
                  <meta.Icon size={20} weight="regular" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-zinc-100 truncate">
                    {item.file_name || 'File'}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                    {item.file_extension && (
                      <span className="uppercase font-mono">{item.file_extension}</span>
                    )}
                    {item.file_size && (
                      <>
                        <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                        <span>{formatBytes(item.file_size)}</span>
                      </>
                    )}
                  </div>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Download"
                  className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <DownloadSimple size={12} weight="regular" />
                </a>
              </div>
            </div>
          )
        })()}

        <div className="absolute top-2 left-2 inline-flex items-center gap-1 h-5 px-1.5 rounded bg-black/70 backdrop-blur border border-white/10 text-[10px] font-medium text-white uppercase tracking-wider">
          {item.type === 'image' && <ImageSquare size={9} weight="fill" />}
          {item.type === 'video' && <VideoCamera size={9} weight="fill" />}
          {item.type === 'file' && <Paperclip size={9} weight="fill" />}
          {String(index + 1).padStart(2, '0')}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            aria-label="Remove"
            className="w-7 h-7 rounded-md bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-red-500/80"
          >
            <X size={11} weight="bold" />
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-zinc-800">
        {!expanded ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {item.caption ? (
                <div className="text-[12px] text-zinc-200 line-clamp-2 leading-relaxed">{item.caption}</div>
              ) : (
                <div className="text-[11.5px] text-zinc-500 italic">Click pencil to add caption</div>
              )}
            </div>
            <button
              onClick={onToggle}
              aria-label="Edit caption"
              className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
            >
              <PencilSimple size={11} weight="regular" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-1.5">
                Caption
              </div>
              <CaptionEditor
                value={item.caption || ''}
                valueHtml={item.caption_html || ''}
                onChange={(text, html) => onUpdate({ caption: text, caption_html: html })}
                placeholder="Write a caption..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400 mb-1.5">
                Description
              </label>
              <textarea
                value={item.description || ''}
                onChange={(e) => onUpdate({ description: e.target.value })}
                rows={3}
                placeholder="Optional longer description..."
                className="w-full px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800 focus:border-zinc-600 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none leading-relaxed"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={onToggle}
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded text-[11.5px] font-semibold text-zinc-300 hover:text-white hover:bg-zinc-900"
              >
                <Check size={11} weight="bold" />
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
