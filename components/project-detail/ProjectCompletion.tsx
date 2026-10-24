'use client'

import { useState } from 'react'
import { X, ArrowRight } from '@phosphor-icons/react'

interface Props {
  percent: number
  onDismiss: () => void
  suggestions?: string[]
}

export function ProjectCompletion({ percent, onDismiss, suggestions = [] }: Props) {
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = async () => {
    setDismissing(true)
    await onDismiss()
  }

  return (
    <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 mb-5 flex items-center gap-4">
      {/* Circular progress */}
      <div className="relative w-12 h-12 flex-shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
          <circle
            cx="20" cy="20" r="16"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 16}
            strokeDashoffset={2 * Math.PI * 16 * (1 - percent / 100)}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[12px] font-bold text-white">{percent}%</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-[15px] font-semibold text-white mb-0.5">Complete your project profile</h4>
        {suggestions.length > 0 ? (
          <p className="text-[13px] text-white/60 leading-snug">
            Missing: {suggestions.slice(0, 3).join(', ')}{suggestions.length > 3 ? ' and more' : ''}
          </p>
        ) : (
          <p className="text-[13px] text-white/60">Add more details to boost discoverability.</p>
        )}
      </div>

      <button
        onClick={handleDismiss}
        disabled={dismissing}
        aria-label="Dismiss"
        className="text-white/40 hover:text-white transition-colors disabled:opacity-50 flex-shrink-0 p-1"
      >
        <X size={18} />
      </button>
    </div>
  )
}
