'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { CaretLeft, CaretRight, Users, Heart, CheckCircle, Trophy, ArrowRight } from '@phosphor-icons/react'

interface Banner {
  slot: number
  type: 'project' | 'custom'
  title?: string
  subtitle?: string | null
  description?: string | null
  image_url?: string | null
  stage?: string | null
  builders?: number
  followers?: number
  is_open_source?: boolean
  is_dsrt_verified?: boolean
  global_rank?: number | null
  cta_label?: string | null
  cta_url?: string | null
  sponsor?: string | null
  project_id?: string
  slug?: string
  active?: boolean
}

interface Props {
  banners: Banner[]
  autoRotate?: boolean
  intervalMs?: number
}

function formatNumber(n: number | undefined | null): string {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

export function ExploreCarousel({ banners, autoRotate = true, intervalMs = 6000 }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeBanners = banners.filter(b => b && b.active !== false)
  const total = activeBanners.length

  const next = useCallback(() => {
    setIndex(i => (total === 0 ? 0 : (i + 1) % total))
  }, [total])

  const prev = useCallback(() => {
    setIndex(i => (total === 0 ? 0 : (i - 1 + total) % total))
  }, [total])

  useEffect(() => {
    if (!autoRotate || paused || total <= 1) return
    timerRef.current = setInterval(next, intervalMs)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [autoRotate, paused, total, intervalMs, next])

  const handleCta = (banner: Banner) => {
    const url = banner.cta_url
    if (!url) return
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      router.push(url)
    }
  }

  if (total === 0) {
    return (
      <div className="w-full rounded-2xl bg-gradient-to-br from-purple-900/30 to-blue-900/20 border border-white/[0.06] flex items-center justify-center" style={{ height: '205px' }}>
        <p className="text-[13px] text-white/40">No featured content</p>
      </div>
    )
  }

  const b = activeBanners[index]

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] group"
      style={{ height: '205px' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        {b.image_url ? (
          <Image src={b.image_url} alt={b.title || 'Featured'} fill className="object-cover transition-transform duration-700" priority={index === 0} sizes="(max-width: 1024px) 100vw, 900px" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-black/10" />
      </div>

      <div className="relative h-full flex flex-col justify-between p-5 md:p-6 text-white max-w-[62%]">
        <div className="flex items-center gap-2">
          {b.type === 'project' ? (
            <span className="inline-flex items-center gap-1 bg-purple-600/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
              <Trophy size={9} weight="fill" /> Trending
            </span>
          ) : b.sponsor ? (
            <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm border border-white/20 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider text-zinc-300">
              Sponsored · {b.sponsor}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">Featured</span>
          )}
          {b.global_rank && (
            <span className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[10px] font-semibold">
              <Trophy size={9} weight="fill" className="text-yellow-400" /> #{b.global_rank}
            </span>
          )}
        </div>

        <div>
          <h2 className="text-xl md:text-2xl font-bold leading-tight mb-1 truncate">{b.title || 'Untitled'}</h2>
          {b.subtitle && <p className="text-[13px] md:text-[14px] text-zinc-200 font-medium mb-2 leading-tight line-clamp-1">{b.subtitle}</p>}
          {b.description && <p className="text-[12px] text-zinc-300 leading-snug mb-3 line-clamp-1 max-w-[90%]">{b.description}</p>}

          {b.type === 'project' && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {b.builders !== undefined && b.builders > 0 && (
                <span className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[10px] font-semibold">
                  <Users size={9} weight="fill" className="text-cyan-300" /> {b.builders}
                </span>
              )}
              {b.followers !== undefined && b.followers > 0 && (
                <span className="inline-flex items-center gap-1 bg-black/50 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[10px] font-semibold">
                  <Heart size={9} weight="fill" className="text-red-400" /> {formatNumber(b.followers)}
                </span>
              )}
              {b.is_open_source && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/25 backdrop-blur-sm border border-emerald-400/30 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-200">
                  <CheckCircle size={9} weight="fill" /> OSS
                </span>
              )}
              {b.is_dsrt_verified && (
                <span className="inline-flex items-center gap-1 bg-blue-500/25 backdrop-blur-sm border border-blue-400/30 px-2 py-0.5 rounded text-[10px] font-semibold text-blue-200">
                  <CheckCircle size={9} weight="fill" /> Verified
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => handleCta(b)}
            className="inline-flex items-center gap-1.5 bg-white text-black hover:bg-purple-100 font-semibold text-[12px] px-4 py-2 rounded-lg transition-colors shadow-lg"
          >
            {b.cta_label || 'View Project'} <ArrowRight size={12} weight="bold" />
          </button>
        </div>
      </div>

      {total > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all" aria-label="Previous">
            <CaretLeft size={14} className="text-white" weight="bold" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all" aria-label="Next">
            <CaretRight size={14} className="text-white" weight="bold" />
          </button>

          <div className="absolute bottom-3 right-4 flex items-center gap-1">
            {activeBanners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={(i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40') + ' h-1.5 rounded-full transition-all'}
                aria-label={'Go to slide ' + (i + 1)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
