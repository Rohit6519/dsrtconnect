'use client'

import { useRef, useState } from 'react'
import { useComposer, type MediaItem } from './ComposerContext'
import { Image as ImageIcon, VideoCamera, Paperclip, X, ArrowsOutSimple } from '@phosphor-icons/react'

export function MediaAttachments() {
  const composer = useComposer()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedKind, setSelectedKind] = useState<'image' | 'video' | 'document'>('image')

  const upload = async (files: FileList | null, kind: 'image' | 'video' | 'document') => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append('file', file)
        fd.append('kind', kind)

        const res = await fetch('/api/home/upload', { method: 'POST', body: fd })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Upload failed')
        }
        const data = await res.json()

        const item: MediaItem = {
          id: 'med_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          url: data.url,
          kind,
          filename: data.filename,
          size: data.size,
          mime_type: data.mime_type,
        }
        composer.addMedia(item)
      }
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const triggerUpload = (kind: 'image' | 'video' | 'document') => {
    setSelectedKind(kind)
    if (inputRef.current) {
      inputRef.current.accept = kind === 'image'
        ? 'image/*'
        : kind === 'video'
        ? 'video/*'
        : '.pdf,.doc,.docx,.ppt,.pptx'
      inputRef.current.multiple = kind === 'image'
      inputRef.current.click()
    }
  }

  const images = composer.media.filter(m => m.kind === 'image')
  const videos = composer.media.filter(m => m.kind === 'video')
  const docs = composer.media.filter(m => m.kind === 'document')

  return (
    <div className="space-y-3">
      {/* Media previews */}
      {composer.media.length > 0 && (
        <div className="space-y-2">
          {/* Images grid */}
          {images.length > 0 && (
            <div className={
              'grid gap-1.5 rounded-lg overflow-hidden border border-zinc-800 ' +
              (images.length === 1 ? 'grid-cols-1' :
               images.length === 2 ? 'grid-cols-2' :
               'grid-cols-2 sm:grid-cols-3')
            }>
              {images.map(m => (
                <div key={m.id} className="relative group aspect-video bg-zinc-900">
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => composer.removeMedia(m.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={11} weight="bold" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {videos.map(m => (
            <div key={m.id} className="relative rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
              <video src={m.url} controls className="w-full max-h-[300px]" />
              <button
                onClick={() => composer.removeMedia(m.id)}
                className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/70 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-red-500/80"
              >
                <X size={11} weight="bold" />
              </button>
            </div>
          ))}

          {/* Documents */}
          {docs.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-950">
              <Paperclip size={13} className="text-zinc-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-zinc-200 font-medium truncate">{m.filename}</div>
                <div className="text-[10.5px] text-zinc-500">
                  {((m.size || 0) / 1024).toFixed(1)} KB
                </div>
              </div>
              <a
                href={m.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
              >
                <ArrowsOutSimple size={11} weight="bold" />
              </a>
              <button
                onClick={() => composer.removeMedia(m.id)}
                className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-zinc-900"
              >
                <X size={11} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-[11.5px] text-zinc-400 px-2">
          <div className="w-3 h-3 border-2 border-zinc-700 border-t-amber-400 rounded-full animate-spin" />
          Uploading {selectedKind}...
        </div>
      )}

      {error && (
        <div className="text-[11.5px] text-red-400 px-2">{error}</div>
      )}

      {/* Upload buttons */}
      <div className="flex items-center gap-1">
        <UploadBtn Icon={ImageIcon} label="Image" onClick={() => triggerUpload('image')} disabled={uploading} />
        <UploadBtn Icon={VideoCamera} label="Video" onClick={() => triggerUpload('video')} disabled={uploading || videos.length > 0} />
        <UploadBtn Icon={Paperclip} label="File" onClick={() => triggerUpload('document')} disabled={uploading} />
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => upload(e.target.files, selectedKind)}
      />
    </div>
  )
}

function UploadBtn({ Icon, label, onClick, disabled }: { Icon: any; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 text-[11.5px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Icon size={12} weight="regular" />
      {label}
    </button>
  )
}