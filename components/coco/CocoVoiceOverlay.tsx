// ============================================================
// components/coco/CocoVoiceOverlay.tsx
// Full-panel overlay while user is speaking.
// Rendered at panel level, not composer level, so it covers everything.
// ============================================================

'use client'

import { X, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  level: number
  onCancel: () => void
  onStop: () => void
  state: 'requesting' | 'recording' | 'stopping'
}

export function CocoVoiceOverlay({ level, onCancel, onStop, state }: Props) {
  const bars = Array.from({ length: 28 }, (_, i) => {
    const centerDist = Math.abs(i - 13.5) / 14
    const wobble = Math.sin(Date.now() / 220 + i) * 0.08 + 0.92
    const base = Math.max(0.1, level * (1 - centerDist * 0.35) * wobble)
    return Math.min(1, base)
  })

  const statusText =
    state === 'requesting'
      ? 'Preparing...'
      : state === 'stopping'
      ? 'Processing...'
      : 'Listening'

  return (
    <div
      className="absolute inset-0 z-[50] flex flex-col items-center justify-between px-6 py-10"
      style={{
        borderRadius: 'inherit',
        background: `
          radial-gradient(circle at 50% 30%, rgba(60, 90, 140, 0.20) 0%, transparent 50%),
          linear-gradient(180deg, rgba(13, 17, 25, 0.98) 0%, rgba(8, 11, 18, 0.98) 100%)
        `,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Top spacer */}
      <div />

      {/* Center: waveform + status */}
      <div className="flex flex-col items-center">
        <div className="flex items-end justify-center gap-[3px] h-28 mb-8">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-white transition-[height] duration-75"
              style={{
                height: `${Math.max(6, h * 108)}px`,
                opacity: 0.4 + h * 0.6,
              }}
            />
          ))}
        </div>

        <p className="text-[17px] font-semibold text-white tracking-tight flex items-center gap-2">
          {state === 'stopping' && <Loader2 className="w-4 h-4 animate-spin" />}
          {statusText}
        </p>
        <p className="text-[12.5px] text-white/55 mt-2 text-center max-w-[260px]">
          Speak naturally — I'll transcribe when you pause.
        </p>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={onCancel}
          disabled={state === 'stopping'}
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'bg-white/[0.06] border border-white/[0.10] text-white/75',
            'hover:bg-white/[0.10] hover:text-white/95 transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed'
          )}
          aria-label="Cancel"
        >
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        <button
          onClick={onStop}
          disabled={state === 'stopping'}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center',
            'bg-white text-black shadow-[0_8px_28px_rgba(255,255,255,0.18)]',
            'hover:bg-white/95 transition-all',
            'disabled:opacity-60 disabled:cursor-not-allowed'
          )}
          aria-label="Send"
        >
          <Check className="w-6 h-6" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}