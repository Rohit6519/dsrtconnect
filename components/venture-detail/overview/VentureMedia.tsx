'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, X, ImageSquare, VideoCamera, CaretLeft, CaretRight, Play, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  venture: any
  isOwner: boolean
}

interface MediaItem {
  id: string
  type: 'image' | 'video'
  url: string
  thumbnail_url?: string
  title?: string
  position: number
}

const MAX_IMAGES = 4
const MAX_VIDEOS = 3

export function VentureMedia({ venture, isOwner }: Props) {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const imgInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const sliderRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/ventures/' + venture.slug + '/media')
      .then(r => r.json())
      .then(d => { setMedia(d.media || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [venture.slug])

  const images = media.filter(m => m.type === 'image')
  const videos = media.filter(m => m.type === 'video')
  const canAddImage = images.length < MAX_IMAGES
  const canAddVideo = videos.length < MAX_VIDEOS

  const upload = async (file: File, type: 'image' | 'video') => {
    setUploading(type)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('kind', type === 'image' ? 'gallery' : 'video')
      const uploadRes = await fetch('/api/ventures/' + venture.slug + '/media', { method: 'POST', body: fd })
      const uj = await uploadRes.json()
      if (!uploadRes.ok) throw new Error(uj.error || 'Upload failed')

      // Create media entry
      const createRes = await fetch('/api/ventures/' + venture.slug + '/media', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, url: uj.url, position: media.length }),
      })
      const cj = await createRes.json()
      if (createRes.ok && cj.media) {
        setMedia([...media, cj.media])
        toast.success((type === 'image' ? 'Image' : 'Video') + ' added')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed')
    } finally {
      setUploading(null)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this media?')) return
    try {
      await fetch('/api/ventures/' + venture.slug + '/media?id=' + id, { method: 'DELETE' })
      setMedia(media.filter(m => m.id !== id))
      toast.success('Removed')
    } catch { toast.error('Failed to remove') }
  }

  const scroll = (dir: 'left' | 'right') => {
    sliderRef.current?.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' })
  }

  if (loading) return null

  const hasMedia = media.length > 0
  if (!hasMedia && !isOwner) return null

  return (
    <>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-white">Media</h2>
            <p className="text-[12px] text-white/45 mt-0.5">
              {images.length}/{MAX_IMAGES} images · {videos.length}/{MAX_VIDEOS} videos
            </p>
          </div>
          {isOwner && (
            <div className="flex items-center gap-2">
              <input ref={imgInputRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'image')} />
              <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'video')} />
              <button
                onClick={() => imgInputRef.current?.click()}
                disabled={!canAddImage || uploading !== null}
                className="text-[11.5px] font-semibold text-white/80 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed px-2.5 h-8 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <ImageSquare size={12} /> {uploading === 'image' ? 'Uploading...' : 'Image'}
              </button>
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={!canAddVideo || uploading !== null}
                className="text-[11.5px] font-semibold text-white/80 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed px-2.5 h-8 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <VideoCamera size={12} /> {uploading === 'video' ? 'Uploading...' : 'Video'}
              </button>
            </div>
          )}
        </div>

        {hasMedia ? (
          <div className="relative p-5">
            {media.length > 2 && (
              <>
                <button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/80 text-white flex items-center justify-center">
                  <CaretLeft size={13} weight="bold" />
                </button>
                <button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 hover:bg-black/80 text-white flex items-center justify-center">
                  <CaretRight size={13} weight="bold" />
                </button>
              </>
            )}
            <div ref={sliderRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
              {media.map((m, i) => (
                <div key={m.id} className="relative flex-shrink-0 snap-start group" style={{ width: 300, height: 180 }}>
                  {m.type === 'image' ? (
                    <img
                      src={m.url}
                      alt=""
                      onClick={() => setLightboxIdx(i)}
                      className="w-full h-full object-cover rounded-lg border border-white/[0.08] cursor-pointer"
                    />
                  ) : (
                    <div className="relative w-full h-full rounded-lg border border-white/[0.08] overflow-hidden bg-black cursor-pointer" onClick={() => setLightboxIdx(i)}>
                      <video src={m.url} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play size={18} weight="fill" className="text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => remove(m.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-md border border-white/20 hover:bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash size={12} weight="regular" />
                    </button>
                  )}
                  <div className="absolute bottom-2 left-2 text-[10px] font-semibold text-white bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded uppercase tracking-wider">
                    {m.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[13px] text-white/40">
              {isOwner ? 'Add up to ' + MAX_IMAGES + ' images and ' + MAX_VIDEOS + ' videos showcasing your venture.' : 'No media yet.'}
            </p>
          </div>
        )}
      </div>

      {lightboxIdx !== null && (
        <MediaLightbox
          media={media[lightboxIdx]}
          onClose={() => setLightboxIdx(null)}
          onPrev={lightboxIdx > 0 ? () => setLightboxIdx(lightboxIdx - 1) : undefined}
          onNext={lightboxIdx < media.length - 1 ? () => setLightboxIdx(lightboxIdx + 1) : undefined}
        />
      )}
    </>
  )
}

function MediaLightbox({ media, onClose, onPrev, onNext }: { media: MediaItem; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <button onClick={onClose} className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center z-10">
        <X size={16} />
      </button>
      {onPrev && (
        <button onClick={(e) => { e.stopPropagation(); onPrev() }} className="absolute left-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center z-10">
          <CaretLeft size={16} weight="bold" />
        </button>
      )}
      {onNext && (
        <button onClick={(e) => { e.stopPropagation(); onNext() }} className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white flex items-center justify-center z-10">
          <CaretRight size={16} weight="bold" />
        </button>
      )}
      <div className="max-w-6xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        {media.type === 'image' ? (
          <img src={media.url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
        ) : (
          <video src={media.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
        )}
      </div>
    </div>
  )
}