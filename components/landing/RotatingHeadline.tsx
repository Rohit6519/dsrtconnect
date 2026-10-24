'use client'

import { useState, useEffect } from 'react'
import { useReducedMotion } from '../background/useReducedMotion'

interface Props {
  phrases: string[]
  interval?: number
}

export function RotatingHeadline({ phrases, interval = 2800 }: Props) {
  const [index, setIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const prefersReducedMotion = useReducedMotion()

  const extendedPhrases = [...phrases, phrases[0]]

  useEffect(() => {
    if (prefersReducedMotion) return

    let timerId: NodeJS.Timeout

    const startTimer = () => {
      timerId = setInterval(() => {
        setIsTransitioning(true)
        setIndex((prev) => prev + 1)
      }, interval)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) clearInterval(timerId)
      else startTimer()
    }

    startTimer()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [interval, prefersReducedMotion])

  const handleTransitionEnd = () => {
    if (index === phrases.length) {
      setIsTransitioning(false)
      setIndex(0)
    }
  }

  // Increased container heights to prevent any text clipping on ascenders/descenders
  const heightClasses = "h-[50px] sm:h-[60px] lg:h-[76px]"
  const textClasses = "text-[32px] sm:text-[40px] lg:text-[46px] font-bold tracking-tight text-[#4F7CFF] whitespace-nowrap leading-tight pt-1"

  if (prefersReducedMotion) {
    return (
      <div className={`${heightClasses} flex items-center`}>
        <span className={textClasses}>{phrases[0]}</span>
      </div>
    )
  }

  return (
    <div className={`${heightClasses} overflow-hidden relative select-none max-w-full`}>
      <div
        className="w-full will-change-transform"
        style={{
          transform: `translateY(-${index * (100 / extendedPhrases.length)}%)`,
          transition: isTransitioning ? 'transform 600ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        {extendedPhrases.map((phrase, i) => (
          <div key={i} className={`${heightClasses} flex items-center`}>
            <span className={textClasses}>{phrase}</span>
          </div>
        ))}
      </div>
    </div>
  )
}