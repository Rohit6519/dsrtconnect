'use client'

import { useEffect, useState } from 'react'
import { X, CaretLeft, CaretRight } from '@phosphor-icons/react'

interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface Props {
  items: MediaItem[]
  startIndex?: number
  onClose: () => void
}

export function MediaLightbox({ items, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % items.length)
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [items.length, onClose])

  if (items.length === 0) return null
  const current = items[index]

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
        aria-label="Close"
      >
        <X size={20} weight="bold" />
      </button>

      {/* Counter */}
      {items.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-[13px] font-medium px-3 py-1.5 rounded-full">
          {index + 1} / {items.length}
        </div>
      )}

      {/* Prev */}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(i => (i - 1 + items.length) % items.length) }}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
          aria-label="Previous"
        >
          <CaretLeft size={22} weight="bold" />
        </button>
      )}

      {/* Media */}
      <div
        className="relative max-w-full max-h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === 'video' ? (
          <video
            src={current.url}
            controls
            autoPlay
            className="max-h-[85vh] max-w-full rounded-lg"
          />
        ) : (
          <img
            src={current.url}
            alt=""
            className="max-h-[85vh] max-w-full object-contain rounded-lg"
          />
        )}
      </div>

      {/* Next */}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex(i => (i + 1) % items.length) }}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-10"
          aria-label="Next"
        >
          <CaretRight size={22} weight="bold" />
        </button>
      )}

      {/* Thumb strip */}
      {items.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto scrollbar-hide bg-black/40 rounded-lg p-2"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={
                'w-14 h-14 rounded overflow-hidden flex-shrink-0 border-2 ' +
                (i === index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-100')
              }
            >
              {item.type === 'video' ? (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white text-[10px]">▶</div>
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
