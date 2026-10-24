'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CaretLeft, CaretRight, DownloadSimple } from '@phosphor-icons/react'

interface ImageLightboxProps {
  images: string[]
  activeIndex: number
  onClose: () => void
  onNavigate?: (newIndex: number) => void
  showDownload?: boolean
}

export function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onNavigate,
  showDownload = true,
}: ImageLightboxProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && onNavigate && activeIndex > 0) {
        onNavigate(activeIndex - 1)
      }
      if (e.key === 'ArrowRight' && onNavigate && activeIndex < images.length - 1) {
        onNavigate(activeIndex + 1)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [activeIndex, images.length, onClose, onNavigate])

  const currentImage = images[activeIndex]
  if (!currentImage) return null

  const download = async () => {
    try {
      const res = await fetch(currentImage)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `image-${activeIndex + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {}
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center z-10"
        >
          <X className="w-5 h-5" weight="bold" />
        </button>

        {/* Download button */}
        {showDownload && (
          <button
            onClick={(e) => { e.stopPropagation(); download() }}
            className="absolute top-4 right-16 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center z-10"
            title="Download"
          >
            <DownloadSimple className="w-5 h-5" weight="bold" />
          </button>
        )}

        {/* Counter */}
        {images.length > 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[13px] text-zinc-400 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 px-3 py-1.5 rounded-full">
            {activeIndex + 1} / {images.length}
          </div>
        )}

        {/* Navigation */}
        {onNavigate && activeIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(activeIndex - 1) }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
          >
            <CaretLeft className="w-5 h-5" weight="bold" />
          </button>
        )}
        {onNavigate && activeIndex < images.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(activeIndex + 1) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center"
          >
            <CaretRight className="w-5 h-5" weight="bold" />
          </button>
        )}

        {/* Image */}
        <motion.img
          key={currentImage}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          src={currentImage}
          alt=""
          className="max-w-[92vw] max-h-[92vh] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </motion.div>
    </AnimatePresence>
  )
}