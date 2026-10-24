'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  X, ArrowRight, ArrowLeft, ChartLineUp,
  CheckCircle, Flag
} from '@phosphor-icons/react'

interface Props {
  slug: string
  ventureName?: string
}

const SLIDES = [
  {
    icon: CheckCircle,
    title: 'Your venture is live',
    body: 'The assessment is complete. Your venture page is the public home — nothing about its design changed. Your answers now power About, market, and focus fields automatically.',
  },
  {
    icon: ChartLineUp,
    title: 'Everything stays in sync',
    body: 'Any edit you make on the Questions tab, Assumptions, or Milestones updates the venture page instantly. One source of truth, everywhere it appears.',
  },
  {
    icon: Flag,
    title: 'Execute in public',
    body: 'Use Assumptions and Milestones to run the next 30 days. Verified ventures rank higher in discovery — real progress compounds over time.',
  },
]

/**
 * Shows once after publish when URL has ?published=1
 * Clears the query param on close so it doesn't reappear.
 */
export function PostPublishWelcomeModal({ slug, ventureName }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (searchParams.get('published') === '1') {
      setOpen(true)
      setSlide(0)
    }
  }, [searchParams])

  const close = () => {
    setOpen(false)
    router.replace(pathname || `/ventures/${slug}`, { scroll: false })
  }

  if (!open) return null

  const current = SLIDES[slide]
  const Icon = current.icon
  const isLast = slide === SLIDES.length - 1

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={close}
    >
      <div
        className="relative w-full max-w-md bg-[#0d0d10] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center z-10"
        >
          <X size={14} />
        </button>

        <div className="p-8">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-zinc-800 flex items-center justify-center">
              <CheckCircle size={14} weight="fill" className="text-white" />
            </div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
              Published{ventureName ? ` · ${ventureName}` : ''}
            </p>
          </div>

          <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-zinc-800 flex items-center justify-center mb-4">
            <Icon size={20} weight="fill" className="text-white" />
          </div>

          <h2 className="text-[20px] font-bold text-white tracking-tight leading-tight">
            {current.title}
          </h2>
          <p className="text-[13.5px] text-zinc-400 mt-2 leading-relaxed">
            {current.body}
          </p>

          {/* Dots */}
          <div className="flex items-center gap-1.5 mt-6 mb-5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlide(i)}
                className={
                  'h-1 rounded-full transition-all ' +
                  (i === slide ? 'w-6 bg-white' : 'w-1.5 bg-zinc-700 hover:bg-zinc-500')
                }
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setSlide(s => Math.max(0, s - 1))}
              disabled={slide === 0}
              className="inline-flex items-center gap-1 h-9 px-3 text-[12.5px] font-medium text-zinc-400 hover:text-white disabled:opacity-30"
            >
              <ArrowLeft size={12} /> Back
            </button>

            {isLast ? (
              <button
                onClick={close}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[13px] font-bold hover:bg-zinc-100"
              >
                Open venture <ArrowRight size={12} weight="bold" />
              </button>
            ) : (
              <button
                onClick={() => setSlide(s => Math.min(SLIDES.length - 1, s + 1))}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-white text-black text-[13px] font-bold hover:bg-zinc-100"
              >
                Next <ArrowRight size={12} weight="bold" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}