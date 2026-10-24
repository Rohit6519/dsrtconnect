// ============================================================
// components/coco/CocoPanel.tsx
// 3D floating panel with save button, voice overlay at panel level.
// ============================================================

'use client'

import { X, Minus, Bookmark, BookmarkCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useCocoUi } from '@/lib/coco/sdk/CocoProvider'
import { useCocoStream } from '@/lib/coco/sdk/useCocoStream'
import { useCocoVoice } from '@/lib/coco/sdk/useCocoVoice'
import { CocoContextBadge } from './CocoContextBadge'
import { CocoMessages } from './CocoMessages'
import { CocoComposer } from './CocoComposer'
import { CocoVoiceOverlay } from './CocoVoiceOverlay'
import { cn } from '@/lib/utils'
import { speakText, stopTTS } from '@/lib/coco/voice/tts'

function cleanDisplayError(rawError: string): string {
  if (!rawError) return 'Something went wrong.'
  if (rawError.includes('404') || rawError.includes('model_not_found'))
    return 'AI updating, one moment...'
  try {
    const parsed = JSON.parse(rawError.substring(rawError.indexOf('{')))
    if (parsed?.error?.message) return parsed.error.message
  } catch {}
  return rawError.length > 120 ? rawError.slice(0, 120) + '...' : rawError
}

export function CocoPanel() {
  const { isOpen, close } = useCocoUi()
  const {
    messages,
    state,
    error,
    conversationId,
    sendMessage,
    confirmAction,
    cancelAction,
    reset,
    rateMessage,
  } = useCocoStream()

  const {
    supported: voiceSupported,
    micState,
    ttsEnabled,
    level,
    startListening,
    stopListening,
    cancel: cancelVoice,
    toggleTTS,
    stopSpeaking,
  } = useCocoVoice()

  const spokenRef = useRef<Set<string>>(new Set())
  const userCountRef = useRef(0)
  const [isPinned, setIsPinned] = useState(false)
  const [pinLoading, setPinLoading] = useState(false)

  const isRecording =
    micState === 'requesting' || micState === 'recording' || micState === 'stopping'

  useEffect(() => {
    const userCount = messages.filter((m) => m.role === 'user').length
    if (userCount > userCountRef.current) stopTTS()
    userCountRef.current = userCount
  }, [messages])

  useEffect(() => {
    const last = [...messages].reverse().find((m) => m.role === 'assistant')
    if (!last || last.streaming || last.content.kind !== 'text') return
    if (spokenRef.current.has(last.id)) return
    if (!last.content.text?.trim()) return
    spokenRef.current.add(last.id)
    if (ttsEnabled) speakText(last.content.text, last.id)
  }, [messages, ttsEnabled])

  useEffect(() => {
    if (!isOpen) {
      stopTTS()
      spokenRef.current.clear()
      setIsPinned(false)
    }
  }, [isOpen])

  // Reset pin state when conversation changes
  useEffect(() => {
    setIsPinned(false)
  }, [conversationId])

  const handleMicClick = async () => {
    stopSpeaking()
    await startListening()
  }

  const handleStopAndSend = async () => {
    const transcript = await stopListening()
    if (transcript) sendMessage(transcript)
  }

  const handleTogglePin = async () => {
    if (!conversationId || pinLoading) return
    setPinLoading(true)
    const nextPin = !isPinned
    setIsPinned(nextPin)
    try {
      await fetch(`/api/coco/conversations/${conversationId}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: nextPin }),
      })
    } catch {
      setIsPinned(!nextPin) // revert on fail
    } finally {
      setPinLoading(false)
    }
  }

  if (!isOpen) return null

  const isBusy = state === 'sending' || state === 'streaming' || state === 'executing'
  const canSave = !!conversationId && messages.length > 0

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={close}
        className="md:hidden fixed inset-0 z-[55] bg-black/50 backdrop-blur-[3px] transition-opacity"
        aria-hidden
      />

      <div
        className={cn(
          'fixed z-[60] pointer-events-none',
          'bottom-4 left-4 right-4',
          'md:bottom-6 md:right-6 md:left-auto'
        )}
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* 3D SHADOW WRAPPER */}
        <div
          className="pointer-events-auto relative"
          style={{
            filter: 'drop-shadow(0 40px 50px rgba(0, 0, 0, 0.75)) drop-shadow(0 20px 25px rgba(0, 0, 0, 0.4))',
          }}
        >
          <div
            className={cn(
              'relative flex flex-col overflow-hidden',
              'w-full h-[60vh] max-h-[560px] rounded-[28px]',
              'md:w-[400px] md:h-[620px] md:rounded-[28px]',
              'border border-white/[0.10]'
            )}
            style={{
              background: `
                radial-gradient(circle at 15% 0%, rgba(60, 80, 120, 0.16) 0%, transparent 45%),
                radial-gradient(circle at 90% 100%, rgba(100, 60, 120, 0.12) 0%, transparent 40%),
                linear-gradient(180deg, #0E1220 0%, #080B14 60%, #05070E 100%)
              `,
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.08),
                inset 0 -1px 0 rgba(0, 0, 0, 0.5),
                inset 1px 0 0 rgba(255, 255, 255, 0.02),
                inset -1px 0 0 rgba(255, 255, 255, 0.02)
              `,
            }}
          >
            {/* Top sheen highlight */}
            <div
              className="absolute inset-x-0 top-0 h-32 pointer-events-none opacity-80"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
              }}
              aria-hidden
            />

            {/* HEADER */}
            <div className="relative flex items-center justify-between px-4 h-12 border-b border-white/[0.05] shrink-0 z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center border border-white/[0.12]"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 100%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                  }}
                >
                  <span className="text-[10px] font-bold text-white tracking-tight">
                    C
                  </span>
                </div>
                <span className="text-[14px] font-semibold text-white/95 tracking-tight">
                  COCO
                </span>
                <CocoContextBadge />
              </div>

              <div className="flex items-center gap-0.5">
                {canSave && (
                  <button
                    onClick={handleTogglePin}
                    disabled={pinLoading}
                    className={cn(
                      'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
                      isPinned
                        ? 'text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/15'
                        : 'text-white/50 hover:text-white/95 hover:bg-white/[0.06]'
                    )}
                    aria-label={isPinned ? 'Unsave conversation' : 'Save conversation'}
                    title={
                      isPinned
                        ? 'Saved — kept beyond 48h'
                        : 'Save this conversation (deletes after 48h if unsaved)'
                    }
                  >
                    {isPinned ? (
                      <BookmarkCheck className="w-4 h-4" strokeWidth={2} />
                    ) : (
                      <Bookmark className="w-4 h-4" strokeWidth={2} />
                    )}
                  </button>
                )}

                <button
                  onClick={reset}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-white/95 hover:bg-white/[0.06] transition-colors"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Minus className="w-4 h-4" strokeWidth={2} />
                </button>
                <button
                  onClick={close}
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white/50 hover:text-white/95 hover:bg-white/[0.06] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 min-h-0 relative">
              <CocoMessages
                messages={messages}
                onConfirmAction={confirmAction}
                onCancelAction={cancelAction}
                onRateMessage={rateMessage}
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="px-4 py-2 border-t border-red-500/20 bg-red-500/[0.05] shrink-0 relative z-10">
                <p className="text-[11.5px] text-red-300/85 font-mono truncate">
                  {cleanDisplayError(error)}
                </p>
              </div>
            )}

            {/* COMPOSER */}
            <div className="shrink-0 relative z-10">
              <CocoComposer
                onSend={sendMessage}
                disabled={isBusy}
                onMicClick={handleMicClick}
                ttsEnabled={ttsEnabled}
                onToggleTTS={toggleTTS}
                voiceSupported={voiceSupported}
              />
            </div>

            {/* VOICE OVERLAY (covers entire panel including composer) */}
            {isRecording && (
              <CocoVoiceOverlay
                level={level}
                state={micState as any}
                onCancel={cancelVoice}
                onStop={handleStopAndSend}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}