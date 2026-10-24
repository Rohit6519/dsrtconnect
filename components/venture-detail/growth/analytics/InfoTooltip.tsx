'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Info } from '@phosphor-icons/react'

interface Props {
  content: string
  formula?: string
}

export function InfoTooltip({ content, formula }: Props) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !tooltipRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const tooltip = tooltipRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 8

    // Preferred: above the trigger
    let top = trigger.top - tooltip.height - margin
    let left = trigger.left + trigger.width / 2 - tooltip.width / 2

    // If tooltip would go above viewport, flip below
    if (top < margin) {
      top = trigger.bottom + margin
    }
    // Clamp horizontal edges
    if (left < margin) left = margin
    if (left + tooltip.width > vw - margin) left = vw - tooltip.width - margin

    setStyle({
      position: 'fixed',
      top: top + 'px',
      left: left + 'px',
      zIndex: 9999,
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node) && !tooltipRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="w-3 h-3 rounded-full text-white/30 hover:text-white/70 flex items-center justify-center transition-colors cursor-help"
        aria-label="More info"
      >
        <Info size={10} weight="regular" />
      </button>
      {open && (
        <div
          ref={tooltipRef}
          style={style}
          className="w-64 bg-[#0a0a0f] border border-white/[0.15] rounded-lg p-2.5 shadow-2xl pointer-events-auto"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-[11px] text-white/85 leading-relaxed font-normal normal-case tracking-normal">
            {content}
          </p>
          {formula && (
            <p className="text-[10px] text-cyan-300/85 leading-relaxed font-mono mt-1.5 pt-1.5 border-t border-white/[0.08] break-words">
              {formula}
            </p>
          )}
        </div>
      )}
    </>
  )
}