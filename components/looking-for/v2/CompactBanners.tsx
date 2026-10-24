'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'

const SLIDES = [
  {
    id: 1,
    image: '/banners/team-up-1.png',
    title: 'Find your next teammate',
    href: '/looking-for?tab=people',
  },
  {
    id: 2,
    image: '/banners/team-up-2.png',
    title: 'Post what you need',
    href: '/looking-for/create',
  },
  {
    id: 3,
    image: '/banners/team-up-3.png',
    title: 'Discover connections',
    href: '/looking-for?tab=suggested',
  },
]

const AUTO_SLIDE_INTERVAL = 5000 // 5 seconds

export function CompactBanners() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (isHovered) return

    timerRef.current = setInterval(() => {
      nextSlide()
    }, AUTO_SLIDE_INTERVAL)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isHovered, nextSlide])

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-[0_4px_24px_rgba(0,0,0,0.5)] group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Slider Track */}
      <div
        className="flex transition-transform duration-700 ease-out w-full"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <Link
            key={slide.id}
            href={slide.href}
            className="relative w-full shrink-0 block aspect-[1920/350] min-h-[140px] sm:min-h-[180px] md:min-h-[220px]"
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.01]"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </Link>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          prevSlide()
        }}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
      >
        <CaretLeft size={16} weight="bold" />
      </button>

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          nextSlide()
        }}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
      >
        <CaretRight size={16} weight="bold" />
      </button>

      {/* Slide Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setCurrentIndex(idx)
            }}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              currentIndex === idx
                ? 'w-6 bg-white'
                : 'w-1.5 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  )
}