// ============================================================
// lib/coco/voice/tts.ts
// Native SpeechSynthesis with pause/resume/message-tracking.
// ============================================================

'use client'

let ttsEnabled = true
let currentUtterance: SpeechSynthesisUtterance | null = null
let currentMessageId: string | null = null
let voicesCache: SpeechSynthesisVoice[] = []

export type TTSState = 'idle' | 'speaking' | 'paused' | 'error'

let stateListeners = new Set<(s: TTSState, messageId: string | null) => void>()
let currentState: TTSState = 'idle'

function setState(s: TTSState, messageId: string | null = null) {
  currentState = s
  stateListeners.forEach((l) => l(s, messageId))
}

export function getTTSState(): { state: TTSState; messageId: string | null } {
  return { state: currentState, messageId: currentMessageId }
}

export function subscribeTTSState(
  fn: (s: TTSState, messageId: string | null) => void
): () => void {
  stateListeners.add(fn)
  return () => stateListeners.delete(fn)
}

export function setTTSEnabled(enabled: boolean) {
  ttsEnabled = enabled
  if (!enabled) stopTTS()
}

export function isTTSSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
}

async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isTTSSupported()) return []
  if (voicesCache.length > 0) return voicesCache

  return new Promise((resolve) => {
    const attempt = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length > 0) {
        voicesCache = v
        resolve(v)
      } else {
        setTimeout(attempt, 120)
      }
    }
    window.speechSynthesis.onvoiceschanged = () => {
      voicesCache = window.speechSynthesis.getVoices()
      resolve(voicesCache)
    }
    attempt()
  })
}

async function pickVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await loadVoices()
  if (voices.length === 0) return null
  const prefs = [
    /Samantha/i,
    /Google US English/i,
    /Microsoft Aria/i,
    /Microsoft Jenny/i,
    /Microsoft Zira/i,
    /Karen/i,
    /Serena/i,
    /^en-US/i,
    /^en-GB/i,
    /^en/i,
  ]
  for (const pref of prefs) {
    const match = voices.find((v) => pref.test(v.name) || pref.test(v.lang))
    if (match) return match
  }
  return voices[0]
}

function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[source:[^\]]+\]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function speakText(text: string, messageId?: string): Promise<void> {
  if (!ttsEnabled || !isTTSSupported()) return
  const clean = cleanForSpeech(text)
  if (!clean) return

  stopTTS()

  const utter = new SpeechSynthesisUtterance(clean)
  const voice = await pickVoice()
  if (voice) utter.voice = voice
  utter.rate = 1.0
  utter.pitch = 1.02
  utter.volume = 1.0

  utter.onstart = () => {
    currentMessageId = messageId || null
    setState('speaking', currentMessageId)
  }
  utter.onend = () => {
    if (currentUtterance === utter) {
      currentUtterance = null
      currentMessageId = null
      setState('idle', null)
    }
  }
  utter.onerror = () => {
    if (currentUtterance === utter) {
      currentUtterance = null
      currentMessageId = null
      setState('error', null)
      setTimeout(() => setState('idle', null), 800)
    }
  }
  utter.onpause = () => {
    if (currentUtterance === utter) setState('paused', currentMessageId)
  }
  utter.onresume = () => {
    if (currentUtterance === utter) setState('speaking', currentMessageId)
  }

  currentUtterance = utter
  try {
    window.speechSynthesis.speak(utter)
  } catch {
    setState('idle', null)
  }
}

export function pauseTTS() {
  if (!isTTSSupported()) return
  try {
    window.speechSynthesis.pause()
    setState('paused', currentMessageId)
  } catch {}
}

export function resumeTTS() {
  if (!isTTSSupported()) return
  try {
    window.speechSynthesis.resume()
    setState('speaking', currentMessageId)
  } catch {}
}

export function toggleTTSPlayback() {
  if (currentState === 'speaking') pauseTTS()
  else if (currentState === 'paused') resumeTTS()
}

export function stopTTS() {
  if (!isTTSSupported()) return
  try {
    window.speechSynthesis.cancel()
  } catch {}
  currentUtterance = null
  currentMessageId = null
  setState('idle', null)
}

/** True if TTS is currently playing or paused for this specific message. */
export function isSpeakingMessage(messageId: string): boolean {
  return currentMessageId === messageId && (currentState === 'speaking' || currentState === 'paused')
}