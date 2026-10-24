// ============================================================
// components/coco/CocoComposer.tsx
// Composer with water gradient animation. Overlay handled by panel.
// ============================================================

'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Plus, Mic, ArrowUp, AudioLines, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
  onMicClick: () => void
  ttsEnabled: boolean
  onToggleTTS: () => void
  voiceSupported: boolean
}

export function CocoComposer({
  onSend,
  disabled,
  onMicClick,
  ttsEnabled,
  onToggleTTS,
  voiceSupported,
}: Props) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const hasText = text.trim().length > 0
  const active = focused || hasText

  return (
    <>
      <style jsx>{`
        @keyframes coco-water {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .coco-composer-shell {
          position: relative;
          border-radius: 24px;
          padding: 1.5px;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.10) 0%,
            rgba(255, 255, 255, 0.02) 40%,
            rgba(255, 255, 255, 0.02) 60%,
            rgba(255, 255, 255, 0.10) 100%
          );
          transition: background 0.4s ease;
        }

        .coco-composer-shell.active {
          background: linear-gradient(
            120deg,
            rgba(147, 197, 253, 0.35) 0%,
            rgba(196, 181, 253, 0.35) 20%,
            rgba(147, 197, 253, 0.35) 40%,
            rgba(255, 255, 255, 0.20) 60%,
            rgba(196, 181, 253, 0.35) 80%,
            rgba(147, 197, 253, 0.35) 100%
          );
          background-size: 300% 300%;
          animation: coco-water 5s ease-in-out infinite;
        }

        .coco-composer-inner {
          background: linear-gradient(180deg, #12161F 0%, #0B0F17 100%);
          border-radius: 22.5px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <div className="px-3 pb-3 pt-2">
        <div className={cn('coco-composer-shell', active && 'active')}>
          <div className="coco-composer-inner flex items-end gap-1.5 px-2 py-2">
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white/95 hover:bg-white/[0.06] transition-colors shrink-0"
              aria-label="Attach"
              disabled={disabled}
              title="Add attachment"
            >
              <Plus className="w-5 h-5" strokeWidth={2} />
            </button>

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                handleInput()
              }}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Ask COCO"
              rows={1}
              disabled={disabled}
              className="flex-1 min-w-0 bg-transparent text-[14px] text-white placeholder:text-white/45 outline-none resize-none py-2 px-1 leading-relaxed max-h-[120px] scrollbar-hide"
            />

            {hasText ? (
              <button
                onClick={handleSend}
                disabled={disabled}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                  'bg-white text-black hover:bg-white/95',
                  'shadow-[0_2px_8px_rgba(255,255,255,0.15)]',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  'transition-all'
                )}
                aria-label="Send"
                title="Send message"
              >
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              </button>
            ) : (
              <>
                <button
                  onClick={onMicClick}
                  disabled={disabled || !voiceSupported}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    voiceSupported
                      ? 'text-white/60 hover:text-white/95 hover:bg-white/[0.06]'
                      : 'text-white/25 cursor-not-allowed'
                  )}
                  aria-label="Voice input"
                  title={voiceSupported ? 'Voice input' : 'Voice not supported'}
                >
                  <Mic className="w-4.5 h-4.5" strokeWidth={2} />
                </button>

                <button
                  onClick={onToggleTTS}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    ttsEnabled
                      ? 'text-white/60 hover:text-white/95 hover:bg-white/[0.06]'
                      : 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]'
                  )}
                  aria-label={ttsEnabled ? 'Mute voice replies' : 'Enable voice replies'}
                  title={ttsEnabled ? 'Voice replies on' : 'Voice replies off'}
                >
                  {ttsEnabled ? (
                    <AudioLines className="w-4.5 h-4.5" strokeWidth={2} />
                  ) : (
                    <VolumeX className="w-4.5 h-4.5" strokeWidth={2} />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}