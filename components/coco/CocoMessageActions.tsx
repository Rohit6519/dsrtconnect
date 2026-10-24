// ============================================================
// components/coco/CocoMessageActions.tsx
// Actions: like / dislike / copy / share / speaker (play-pause)
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { ThumbsUp, ThumbsDown, Copy, Check, Share2, Volume2, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { speakText, pauseTTS, resumeTTS, stopTTS, subscribeTTSState } from '@/lib/coco/voice/tts'

interface Props {
  messageId: string
  content: string
  feedback?: 1 | -1 | 0
  onRate: (rating: 1 | -1 | 0) => void
}

export function CocoMessageActions({ messageId, content, feedback, onRate }: Props) {
  const [copied, setCopied] = useState(false)
  const [ttsState, setTTSState] = useState<'idle' | 'speaking' | 'paused' | 'error'>('idle')
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)

  useEffect(() => {
    return subscribeTTSState((s, msgId) => {
      setTTSState(s)
      setActiveMessageId(msgId)
    })
  }, [])

  const isThisMessage = activeMessageId === messageId
  const isSpeakingThis = isThisMessage && ttsState === 'speaking'
  const isPausedThis = isThisMessage && ttsState === 'paused'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = content
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      } finally {
        document.body.removeChild(ta)
      }
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: content })
      } catch {}
    } else {
      handleCopy()
    }
  }

  const handleSpeakerClick = () => {
    if (isSpeakingThis) {
      pauseTTS()
    } else if (isPausedThis) {
      resumeTTS()
    } else {
      // Not this message playing → start fresh
      stopTTS()
      speakText(content, messageId)
    }
  }

  const btn =
    'w-7 h-7 rounded-md flex items-center justify-center text-white/45 hover:text-white/90 hover:bg-white/[0.06] transition-colors'
  const btnActive = 'text-white bg-white/[0.10]'

  return (
    <div className="flex items-center gap-0.5 mt-2 -ml-1">
      <button
        onClick={() => onRate(feedback === 1 ? 0 : 1)}
        className={cn(btn, feedback === 1 && btnActive)}
        title="Good response"
        aria-label="Like"
      >
        <ThumbsUp
          className="w-3.5 h-3.5"
          strokeWidth={2}
          fill={feedback === 1 ? 'currentColor' : 'none'}
        />
      </button>

      <button
        onClick={() => onRate(feedback === -1 ? 0 : -1)}
        className={cn(btn, feedback === -1 && btnActive)}
        title="Poor response"
        aria-label="Dislike"
      >
        <ThumbsDown
          className="w-3.5 h-3.5"
          strokeWidth={2}
          fill={feedback === -1 ? 'currentColor' : 'none'}
        />
      </button>

      <button
        onClick={handleSpeakerClick}
        className={cn(btn, (isSpeakingThis || isPausedThis) && btnActive)}
        title={isSpeakingThis ? 'Pause' : isPausedThis ? 'Resume' : 'Read aloud'}
        aria-label={isSpeakingThis ? 'Pause' : isPausedThis ? 'Resume' : 'Read aloud'}
      >
        {isSpeakingThis ? (
          <Pause className="w-3.5 h-3.5" strokeWidth={2} />
        ) : isPausedThis ? (
          <Play className="w-3.5 h-3.5" strokeWidth={2} />
        ) : (
          <Volume2 className="w-3.5 h-3.5" strokeWidth={2} />
        )}
      </button>

      <button onClick={handleShare} className={btn} title="Share" aria-label="Share">
        <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
      </button>

      <button
        onClick={handleCopy}
        className={cn(btn, copied && 'text-emerald-300')}
        title={copied ? 'Copied!' : 'Copy'}
        aria-label="Copy"
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        ) : (
          <Copy className="w-3.5 h-3.5" strokeWidth={2} />
        )}
      </button>
    </div>
  )
}