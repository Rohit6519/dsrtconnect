'use client'

import React, { useState, useEffect, useRef } from 'react'
import { CaretLeft, CaretRight, Play, Pause } from '@phosphor-icons/react'

interface Banner {
  id: string
  image_url: string
  cta_route?: string
  title?: string
}

interface FeaturedCarouselProps {
  banners: Banner[]
}

const VENTURE_FALLBACK_BANNERS = [
  '/banners/venture-1.png',
  '/banners/venture-2.png',
  '/banners/venture-3.png',
  '/banners/venture-4.png',
  '/banners/venture-5.png',
  '/banners/coco-bg.png',
  '/banners/team-up-2.png',
  '/dsrt-community-banner.png',
]

export function FeaturedCarousel({ banners }: FeaturedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const trackedImpressions = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (isPaused || !banners || banners.length <= 1) return
    timerRef.current = setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % banners.length)
    }, 7000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIndex, isPaused, banners])

  // Impression only (no click / no navigation)
  useEffect(() => {
    if (!banners || banners.length === 0) return
    const activeBanner = banners[currentIndex]
    if (activeBanner && !trackedImpressions.current.has(activeBanner.id)) {
      trackedImpressions.current.add(activeBanner.id)
      fetch('/api/ventures/explore/banner-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banner_id: activeBanner.id, event_type: 'impression' }),
      }).catch(() => {})
    }
  }, [currentIndex, banners])

  if (!banners || banners.length === 0) return null

  const activeBanner = banners[currentIndex] || banners[0]
  const bannerId = activeBanner.id || `venture-banner-${currentIndex}`
  const hasError = imageErrors[bannerId]
  const displayImageUrl = hasError
    ? VENTURE_FALLBACK_BANNERS[currentIndex % VENTURE_FALLBACK_BANNERS.length]
    : activeBanner.image_url || VENTURE_FALLBACK_BANNERS[0]

  const handleImageError = () => {
    setImageErrors(prev => ({ ...prev, [bannerId]: true }))
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0d10] group shadow-xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Shorter standard strip — no links */}
      <div className="relative w-full aspect-[5/1] max-h-[140px] sm:max-h-[180px] md:max-h-[220px] overflow-hidden bg-zinc-900">
        <img
          src={displayImageUrl}
          alt={activeBanner.title || 'Venture featured banner'}
          onError={handleImageError}
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />

        {banners.length > 1 && (
          <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/10 scale-75 sm:scale-100 origin-bottom-right">
            <div className="flex items-center gap-1.5">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="ml-1 text-zinc-400 hover:text-white transition-colors"
              aria-label={isPaused ? 'Play' : 'Pause'}
            >
              {isPaused ? <Play size={10} weight="fill" /> : <Pause size={10} weight="fill" />}
            </button>
          </div>
        )}

        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => (prev - 1 + banners.length) % banners.length)}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <CaretLeft size={14} weight="bold" className="sm:w-4 sm:h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => (prev + 1) % banners.length)}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
            >
              <CaretRight size={14} weight="bold" className="sm:w-4 sm:h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  )
}