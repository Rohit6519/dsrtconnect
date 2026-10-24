// ============================================================
// lib/coco/sdk/useCocoVoice.ts
// ============================================================

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { VoiceRecorder, type VoiceRecorderState } from '@/lib/coco/voice/recorder'
import {
  isTTSSupported,
  setTTSEnabled,
  speakText,
  stopTTS,
  pauseTTS,
  resumeTTS,
  toggleTTSPlayback,
  subscribeTTSState,
  type TTSState,
} from '@/lib/coco/voice/tts'

export interface UseCocoVoiceReturn {
  supported: boolean
  micState: VoiceRecorderState
  ttsState: TTSState
  ttsEnabled: boolean
  ttsMessageId: string | null
  level: number
  error: string | null
  startListening: () => Promise<void>
  stopListening: () => Promise<string | null>
  cancel: () => void
  toggleTTS: () => void
  speak: (text: string, messageId?: string) => Promise<void>
  stopSpeaking: () => void
  pauseSpeaking: () => void
  resumeSpeaking: () => void
  togglePlayback: () => void
}

export function useCocoVoice(): UseCocoVoiceReturn {
  const recorderRef = useRef<VoiceRecorder | null>(null)
  const [micState, setMicState] = useState<VoiceRecorderState>('idle')
  const [ttsState, setTTSState] = useState<TTSState>('idle')
  const [ttsMessageId, setTTSMessageId] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [ttsEnabled, setTTSEnabledState] = useState(true)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== 'undefined'
    )
  }, [])

  useEffect(() => {
    return subscribeTTSState((s, msgId) => {
      setTTSState(s)
      setTTSMessageId(msgId)
    })
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('coco:tts')
      if (saved === '0') {
        setTTSEnabledState(false)
        setTTSEnabled(false)
      }
    } catch {}
  }, [])

  const startListening = useCallback(async () => {
    if (!supported) {
      setError('Voice input not supported in this browser.')
      return
    }
    setError(null)
    stopTTS()

    recorderRef.current = new VoiceRecorder({
      onLevel: setLevel,
      onError: (msg) => setError(msg),
      onState: setMicState,
      silenceTimeoutMs: 1400,
      silenceThreshold: 0.02,
      maxDurationMs: 60_000,
    })

    await recorderRef.current.start()
  }, [supported])

  const stopListening = useCallback(async (): Promise<string | null> => {
    const rec = recorderRef.current
    if (!rec) return null

    const result = await rec.stop()
    recorderRef.current = null
    setLevel(0)

    if (!result || result.blob.size === 0) return null

    try {
      const fd = new FormData()
      fd.append('audio', result.blob, `speech.${extFromMime(result.mimeType)}`)

      const res = await fetch('/api/coco/voice/transcribe', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'Transcription failed.')
        return null
      }
      if (json?.empty) return null
      return (json?.text as string) || null
    } catch (err: any) {
      setError(err?.message || 'Transcription failed.')
      return null
    }
  }, [])

  const cancel = useCallback(() => {
    recorderRef.current?.cancel()
    recorderRef.current = null
    setLevel(0)
  }, [])

  const toggleTTS = useCallback(() => {
    setTTSEnabledState((prev) => {
      const next = !prev
      setTTSEnabled(next)
      try {
        localStorage.setItem('coco:tts', next ? '1' : '0')
      } catch {}
      if (!next) stopTTS()
      return next
    })
  }, [])

  const speak = useCallback(
    async (text: string, messageId?: string) => {
      if (!ttsEnabled) return
      await speakText(text, messageId)
    },
    [ttsEnabled]
  )

  return {
    supported,
    micState,
    ttsState,
    ttsEnabled,
    ttsMessageId,
    level,
    error,
    startListening,
    stopListening,
    cancel,
    toggleTTS,
    speak,
    stopSpeaking: stopTTS,
    pauseSpeaking: pauseTTS,
    resumeSpeaking: resumeTTS,
    togglePlayback: toggleTTSPlayback,
  }
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a'
  if (mime.includes('wav')) return 'wav'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}