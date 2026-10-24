// ============================================================
// lib/coco/voice/recorder.ts
// Browser-side audio recorder using MediaRecorder + WebAudio.
// Handles permission, mime selection, and level metering.
// ============================================================

'use client'

export type VoiceRecorderState = 'idle' | 'requesting' | 'recording' | 'stopping'

export interface VoiceRecorderOptions {
  onLevel?: (level: number) => void
  onError?: (message: string) => void
  onState?: (state: VoiceRecorderState) => void
  /** Auto-stop after N ms of continuous silence. 0 disables. */
  silenceTimeoutMs?: number
  /** Below this RMS level counts as silence (0–1). */
  silenceThreshold?: number
  /** Max recording length. */
  maxDurationMs?: number
}

export class VoiceRecorder {
  private stream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private levelRaf: number | null = null
  private chunks: Blob[] = []
  private mimeType = ''
  private silenceStart: number | null = null
  private startedAt = 0
  private stopTimer: number | null = null

  constructor(private options: VoiceRecorderOptions = {}) {}

  private setState(s: VoiceRecorderState) {
    this.options.onState?.(s)
  }

  private static pickMime(): string {
    if (typeof MediaRecorder === 'undefined') return ''
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ]
    for (const t of candidates) {
      try {
        if (MediaRecorder.isTypeSupported(t)) return t
      } catch {}
    }
    return ''
  }

  async start(): Promise<void> {
    if (this.mediaRecorder) return

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.options.onError?.('Microphone not supported in this browser.')
      return
    }

    this.setState('requesting')

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err: any) {
      const msg =
        err?.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : err?.message || 'Could not access microphone.'
      this.options.onError?.(msg)
      this.setState('idle')
      return
    }

    this.mimeType = VoiceRecorder.pickMime()
    try {
      this.mediaRecorder = this.mimeType
        ? new MediaRecorder(this.stream, { mimeType: this.mimeType })
        : new MediaRecorder(this.stream)
    } catch {
      this.options.onError?.('Recorder init failed.')
      this.cleanup()
      this.setState('idle')
      return
    }

    this.chunks = []
    this.startedAt = Date.now()
    this.silenceStart = null

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data)
    }

    this.mediaRecorder.onerror = () => {
      this.options.onError?.('Recording error.')
    }

    // Start metering
    try {
      const Ctor: any = (window as any).AudioContext || (window as any).webkitAudioContext
      this.audioContext = new Ctor()
      const source = this.audioContext!.createMediaStreamSource(this.stream)
      this.analyser = this.audioContext!.createAnalyser()
      this.analyser.fftSize = 512
      source.connect(this.analyser)
      this.pollLevel()
    } catch {
      // metering optional
    }

    this.mediaRecorder.start(200) // small chunks so stop is fast
    this.setState('recording')

    const maxMs = this.options.maxDurationMs ?? 60_000
    if (maxMs > 0) {
      this.stopTimer = window.setTimeout(() => this.stop(), maxMs) as unknown as number
    }
  }

  private pollLevel = () => {
    if (!this.analyser) return
    const buf = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteTimeDomainData(buf)

    let sum = 0
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / buf.length)
    const level = Math.min(1, rms * 3.2)
    this.options.onLevel?.(level)

    const silenceMs = this.options.silenceTimeoutMs ?? 0
    const threshold = this.options.silenceThreshold ?? 0.02

    if (silenceMs > 0) {
      const now = Date.now()
      if (level < threshold) {
        if (this.silenceStart == null) this.silenceStart = now
        else if (now - this.silenceStart > silenceMs && now - this.startedAt > 800) {
          this.stop()
          return
        }
      } else {
        this.silenceStart = null
      }
    }

    this.levelRaf = requestAnimationFrame(this.pollLevel)
  }

  async stop(): Promise<{ blob: Blob; mimeType: string; durationMs: number } | null> {
    // Capture to local so TS narrows correctly inside async callback
    const rec = this.mediaRecorder
    if (!rec || rec.state === 'inactive') {
      this.cleanup()
      this.setState('idle')
      return null
    }

    this.setState('stopping')

    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType || 'audio/webm' })
        const durationMs = Date.now() - this.startedAt
        this.cleanup()
        this.setState('idle')
        resolve({ blob, mimeType: this.mimeType || 'audio/webm', durationMs })
      }
      try {
        rec.stop()
      } catch {
        this.cleanup()
        this.setState('idle')
        resolve(null)
      }
    })
  }

  cancel() {
    this.cleanup()
    this.setState('idle')
  }

  private cleanup() {
    if (this.stopTimer) {
      clearTimeout(this.stopTimer)
      this.stopTimer = null
    }
    if (this.levelRaf) {
      cancelAnimationFrame(this.levelRaf)
      this.levelRaf = null
    }
    try {
      this.stream?.getTracks().forEach((t) => t.stop())
    } catch {}
    try {
      this.audioContext?.close()
    } catch {}
    this.stream = null
    this.mediaRecorder = null
    this.audioContext = null
    this.analyser = null
    this.chunks = []
  }
}