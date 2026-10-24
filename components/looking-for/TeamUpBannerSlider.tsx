'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { AbstractBanner } from './AbstractBanner'

const AUTOPLAY_MS = 6000

interface BannerConfig {
  id: string
  variant: 'wave' | 'mesh' | 'lines'
  title: string
  subtitle: string
  cta_label?: string
  cta_url?: string
}

const BANNERS: BannerConfig[] = [
  {
    id: 'banner-1',
    variant: 'wave',
    title: 'Build with the right people',
    subtitle: 'Discover opportunities across ventures, projects and communities.',
  },
  {
    id: 'banner-2',
    variant: 'mesh',
    title: 'Where builders find their people',
    subtitle: 'Post an opportunity. Reach thousands of builders on DSRT.',
    cta_label: 'Create request',
    cta_url: '/looking-for/create',
  },
  {
    id: 'banner-3',
    variant: 'lines',
    title: 'Every great venture starts with a team',
    subtitle: 'Explore opportunities across projects, ventures and communities.',
  },
]

export function TeamUpBannerSlider() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const goTo = useCallback((i: number) => {
    const next = ((i % BANNERS.length) + BANNERS.length) % BANNERS.length
    setIndex(next)
  }, [])

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  useEffect(() => {
    if (paused || BANNERS.length <= 1) return
    intervalRef.current = setInterval(() => {
      setIndex(i => (i + 1) % BANNERS.length)
    }, AUTOPLAY_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [paused])

  return (
    <div
      className="relative w-full aspect-[5/1] rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950 group"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {BANNERS.map((b, i) => (
        <AbstractBanner key={b.id} banner={b} active={i === index} />
      ))}

      {BANNERS.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous banner"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          <button
            onClick={next}
            aria-label="Next banner"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </>
      )}

      {BANNERS.length > 1 && (
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-10 flex items-center gap-1.5">
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={
                'transition-all rounded-full ' +
                (i === index
                  ? 'w-7 h-1.5 bg-white'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80')
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
