'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  CaretLeft, CaretRight, Play, Pause, FilePdf, File as FileIcon,
  DownloadSimple, Image as ImageIcon, VideoCamera,
} from '@phosphor-icons/react'
import { ImageLightbox } from '../shared/ImageLightbox'
import { toast } from 'sonner'

export interface MediaItem {
  id?: string
  media_type: 'image' | 'video' | 'pdf' | 'attachment'
  url: string
  thumbnail_url?: string | null
  filename?: string | null
  duration_seconds?: number | null
  file_size?: number | null
}

interface MediaCarouselProps {
  media: MediaItem[]
  title?: string
  autoScrollInterval?: number
  compact?: boolean                    // smaller nav arrows for cards
  onMediaClick?: () => void            // for card mode: click media = navigate away
  disableLightbox?: boolean            // card mode: use onMediaClick instead
  showTitleOverlay?: boolean
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaCarousel({
  media,
  title,
  autoScrollInterval = 3500,
  compact = false,
  onMediaClick,
  disableLightbox = false,
  showTitleOverlay = true,
}: MediaCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [autoScroll, setAutoScroll] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [videoPlayingIndex, setVideoPlayingIndex] = useState<number | null>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [progress, setProgress] = useState(0)   // 0-100 for progress bar
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const activeMedia = media[activeIndex]

  // Reset video on switch
  useEffect(() => {
    setVideoPlayingIndex(null)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setProgress(0)
  }, [activeIndex])

  // Auto-scroll + progress tracking
  useEffect(() => {
    if (
      !autoScroll ||
      isPaused ||
      videoPlayingIndex !== null ||
      lightboxOpen ||
      media.length <= 1
    ) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
      setProgress(0)
      return
    }

    // Set slide advance timer
    timerRef.current = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % media.length)
    }, autoScrollInterval)

    // Set progress tracker (updates every 50ms)
    const startTime = Date.now()
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(100, (elapsed / autoScrollInterval) * 100)
      setProgress(pct)
    }, 50)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (progressTimerRef.current) clearInterval(progressTimerRef.current)
    }
  }, [autoScroll, activeIndex, isPaused, videoPlayingIndex, lightboxOpen, media.length, autoScrollInterval])

  // Keyboard nav (disabled in compact/card mode to avoid conflicts)
  useEffect(() => {
    if (compact || lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') navigatePrev()
      if (e.key === 'ArrowRight') navigateNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compact, lightboxOpen, media.length])

  const navigatePrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveIndex((i) => (i - 1 + media.length) % media.length)
  }, [media.length])

  const navigateNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation()
    setActiveIndex((i) => (i + 1) % media.length)
  }, [media.length])

  const handleMainClick = (e: React.MouseEvent) => {
    if (!activeMedia) return

    // Card mode: click media = navigate to detail lightbox (parent handles)
    if (onMediaClick) {
      // Videos: click still plays them locally (users can watch inside cards without navigating)
      if (activeMedia.media_type === 'video') {
        e.stopPropagation()
        if (videoPlayingIndex === activeIndex) {
          videoRef.current?.pause()
          setVideoPlayingIndex(null)
        } else {
          setVideoPlayingIndex(activeIndex)
          setTimeout(() => videoRef.current?.play(), 50)
        }
        return
      }
      // Everything else: bubble up to parent (opens detail lightbox)
      return
    }

    // Non-card mode (detail lightbox itself)
    if (activeMedia.media_type === 'image') {
      if (!disableLightbox) setLightboxOpen(true)
    } else if (activeMedia.media_type === 'video') {
      if (videoPlayingIndex === activeIndex) {
        videoRef.current?.pause()
        setVideoPlayingIndex(null)
      } else {
        setVideoPlayingIndex(activeIndex)
        setTimeout(() => videoRef.current?.play(), 50)
      }
    } else {
      downloadFile(activeMedia)
    }
  }

  const downloadFile = async (item: MediaItem) => {
    try {
      const res = await fetch(item.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.filename || 'download'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded')
    } catch {
      toast.error('Download failed')
    }
  }

  const imageOnlyList = media
    .map((m, i) => ({ item: m, originalIndex: i }))
    .filter((x) => x.item.media_type === 'image')
  const currentImageIndexInList = imageOnlyList.findIndex((x) => x.originalIndex === activeIndex)

  if (media.length === 0) {
    return (
      <div className="aspect-video rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-zinc-600 gap-2">
        <ImageIcon className="w-8 h-8" weight="duotone" />
        <p className="text-[12px] italic">No media added yet</p>
      </div>
    )
  }

  const arrowSize = compact ? 'w-7 h-7' : 'w-8 h-8'
  const iconSize = compact ? 'w-3.5 h-3.5' : 'w-4 h-4'

  return (
    <>
      <div
        className="relative"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Main viewer */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 group">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              {activeMedia.media_type === 'image' && (
                <button
                  onClick={handleMainClick}
                  className={cn(
                    'w-full h-full block',
                    onMediaClick ? 'cursor-pointer' : 'cursor-zoom-in',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeMedia.url}
                    alt={activeMedia.filename || title || ''}
                    className="w-full h-full object-cover"
                  />
                </button>
              )}

              {activeMedia.media_type === 'video' && (
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    src={activeMedia.url}
                    className="w-full h-full object-contain bg-black"
                    controls={videoPlayingIndex === activeIndex}
                    onEnded={() => setVideoPlayingIndex(null)}
                    onPause={() => {
                      if (videoRef.current?.paused) setVideoPlayingIndex(null)
                    }}
                  />
                  {videoPlayingIndex !== activeIndex && (
                    <button
                      onClick={handleMainClick}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                    >
                      <div className={cn(
                        'rounded-full bg-white/95 shadow-2xl flex items-center justify-center hover:scale-110 transition-transform',
                        compact ? 'w-12 h-12' : 'w-16 h-16',
                      )}>
                        <Play className={cn(
                          'text-black ml-1',
                          compact ? 'w-5 h-5' : 'w-7 h-7',
                        )} weight="fill" />
                      </div>
                    </button>
                  )}
                </div>
              )}

              {(activeMedia.media_type === 'pdf' || activeMedia.media_type === 'attachment') && (
                <button
                  onClick={onMediaClick || handleMainClick}
                  className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-zinc-900 to-zinc-950 hover:from-zinc-800 hover:to-zinc-900 transition-colors group px-4"
                >
                  {activeMedia.media_type === 'pdf' ? (
                    <FilePdf className={compact ? 'w-10 h-10 text-red-400' : 'w-16 h-16 text-red-400'} weight="duotone" />
                  ) : (
                    <FileIcon className={compact ? 'w-10 h-10 text-zinc-400' : 'w-16 h-16 text-zinc-400'} weight="duotone" />
                  )}
                  <div className="text-center max-w-full">
                    <p className={cn(
                      'font-semibold text-zinc-200 truncate',
                      compact ? 'text-[11px]' : 'text-[13px]',
                    )}>
                      {activeMedia.filename || 'Document'}
                    </p>
                    {activeMedia.file_size && !compact && (
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {formatFileSize(activeMedia.file_size)}
                      </p>
                    )}
                  </div>
                  {!onMediaClick && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-[12px] font-semibold group-hover:bg-zinc-100 transition-colors">
                      <DownloadSimple className="w-3.5 h-3.5" weight="bold" />
                      Download
                    </div>
                  )}
                </button>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Counter overlay */}
          {media.length > 1 && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/10 text-[10px] font-semibold text-white/90 pointer-events-none">
              {activeIndex + 1} / {media.length}
            </div>
          )}

          {/* Title overlay */}
          {showTitleOverlay && title && videoPlayingIndex !== activeIndex && (
            <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
              <div className="inline-block px-2 py-1 rounded-md bg-gradient-to-r from-black/70 to-transparent">
                <p className={cn(
                  'font-bold text-white drop-shadow-lg',
                  compact ? 'text-[11px]' : 'text-[13px]',
                )}>
                  {title}
                </p>
              </div>
            </div>
          )}

          {/* Nav arrows */}
          {media.length > 1 && (
            <>
              <button
                onClick={navigatePrev}
                className={cn(
                  'absolute left-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80',
                  arrowSize,
                )}
                title="Previous"
              >
                <CaretLeft className={iconSize} weight="bold" />
              </button>
              <button
                onClick={navigateNext}
                className={cn(
                  'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80',
                  arrowSize,
                )}
                title="Next"
              >
                <CaretRight className={iconSize} weight="bold" />
              </button>
            </>
          )}

          {/* Auto-scroll progress bar (bottom edge of viewer) */}
          {autoScroll && !isPaused && videoPlayingIndex === null && media.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40 pointer-events-none">
              <div
                className="h-full bg-blue-400 transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Thumbnail strip */}
        {media.length > 1 && !compact && (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {media.map((item, i) => (
              <button
                key={item.id || i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i) }}
                className={cn(
                  'relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all',
                  i === activeIndex
                    ? 'border-white'
                    : 'border-zinc-800 hover:border-zinc-700 opacity-70 hover:opacity-100',
                )}
              >
                {item.media_type === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="w-full h-full object-cover" />
                )}
                {item.media_type === 'video' && (
                  <div className="relative w-full h-full bg-black">
                    {item.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                        <VideoCamera className="w-4 h-4 text-zinc-500" weight="duotone" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-5 h-5 rounded-full bg-white/95 flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 text-black ml-0.5" weight="fill" />
                      </div>
                    </div>
                    {item.duration_seconds && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] font-semibold text-white bg-black/80 px-1 rounded">
                        {formatDuration(item.duration_seconds)}
                      </span>
                    )}
                  </div>
                )}
                {item.media_type === 'pdf' && (
                  <div className="w-full h-full bg-red-950/30 flex items-center justify-center">
                    <FilePdf className="w-6 h-6 text-red-400" weight="duotone" />
                  </div>
                )}
                {item.media_type === 'attachment' && (
                  <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-zinc-400" weight="duotone" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Play/Pause pill (compact + non-compact) */}
        {media.length > 1 && (
          <div className={cn(
            'flex items-center justify-center',
            compact ? 'mt-2' : 'mt-2',
          )}>
            <button
              onClick={(e) => { e.stopPropagation(); setAutoScroll((v) => !v) }}
              className={cn(
                'flex items-center gap-1.5 rounded-full font-semibold transition-all border',
                compact ? 'h-6 px-2 text-[10px]' : 'h-7 px-3 text-[11px]',
                autoScroll
                  ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700',
              )}
            >
              {autoScroll ? (
                <>
                  <Pause className="w-2.5 h-2.5" weight="fill" />
                  {compact ? 'Playing' : 'Auto Scroll ON'}
                </>
              ) : (
                <>
                  <Play className="w-2.5 h-2.5" weight="fill" />
                  {compact ? 'Play' : 'Auto Scroll'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Lightbox for images (only when disableLightbox is false — detail view) */}
      {lightboxOpen && !disableLightbox && imageOnlyList.length > 0 && (
        <ImageLightbox
          images={imageOnlyList.map((x) => x.item.url)}
          activeIndex={Math.max(0, currentImageIndexInList)}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(newIdx) => {
            const target = imageOnlyList[newIdx]
            if (target) setActiveIndex(target.originalIndex)
          }}
        />
      )}
    </>
  )
}