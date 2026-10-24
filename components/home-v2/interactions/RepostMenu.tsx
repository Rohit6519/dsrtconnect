'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowsClockwise, Quotes, Check } from '@phosphor-icons/react'

interface Props {
  hasReposted: boolean
  onRepost: () => void
  onQuote: () => void
  onClose: () => void
}

export function RepostMenu({ hasReposted, onRepost, onQuote, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => window.addEventListener('click', handler), 0)
    return () => window.removeEventListener('click', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className={
        'absolute bottom-full left-0 mb-2 w-52 rounded-lg overflow-hidden ' +
        'bg-zinc-950/95 backdrop-blur-md border border-zinc-800 ' +
        'shadow-[0_8px_28px_rgba(0,0,0,0.6)] z-40 py-1'
      }
    >
      <MenuItem Icon={ArrowsClockwise} label={hasReposted ? 'Undo repost' : 'Repost'} onClick={onRepost} active={hasReposted} />
      <MenuItem Icon={Quotes} label="Quote post" onClick={onQuote} />
    </div>
  )
}

function MenuItem({ Icon, label, onClick, active }: { Icon: any; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[12.5px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
    >
      <Icon size={13} weight="regular" className={active ? 'text-emerald-400' : ''} />
      {label}
      {active && <Check size={11} weight="bold" className="ml-auto text-emerald-400" />}
    </button>
  )
}