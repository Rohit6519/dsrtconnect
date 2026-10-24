// ============================================================
// app/api/coco/voice/transcribe/route.ts
// Speech-to-text via Groq Whisper Turbo.
// ============================================================

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import Groq from 'groq-sdk'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024 // 20MB
const ACCEPTED_MIME = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/m4a',
  'audio/x-m4a',
]

function getGroqKey(): string | null {
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_BACKUP_1,
    process.env.GROQ_API_KEY_BACKUP_2,
  ].filter((k): k is string => Boolean(k && k.trim().length > 0))
  return keys.length > 0 ? keys[Math.floor(Math.random() * keys.length)] : null
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = getGroqKey()
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Voice transcription unavailable — no API key configured.' },
      { status: 503 }
    )
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get('audio')
    const sessionId = formData.get('session_id') as string | null
    const conversationId = formData.get('conversation_id') as string | null

    if (!(audioFile instanceof Blob)) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    if (audioFile.size === 0) {
      return NextResponse.json({ error: 'Empty audio file' }, { status: 400 })
    }

    if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { error: `Audio too large. Max ${MAX_AUDIO_SIZE_BYTES / 1024 / 1024}MB.` },
        { status: 413 }
      )
    }

    // Some browsers don't set proper mime for MediaRecorder. Be permissive.
    const mime = audioFile.type || 'audio/webm'

    // Convert Blob → File the Groq SDK accepts
    const filename = `speech.${mime.includes('mp4') || mime.includes('m4a') ? 'm4a' : mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm'}`
    const nodeFile = new File([audioFile], filename, { type: mime })

    const groq = new Groq({ apiKey })

    const startTime = Date.now()

    // Whisper Turbo — fastest + free-tier friendly
    const result = await groq.audio.transcriptions.create({
      file: nodeFile,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      temperature: 0,
      // language: 'en', // let it auto-detect for multilingual users
    })

    const latencyMs = Date.now() - startTime
    const text = (result as any)?.text?.toString().trim() || ''

    // Fire-and-forget: update voice session stats
    if (sessionId) {
      Promise.resolve().then(async () => {
        try {
          const { data: session } = await adminClient
            .from('coco_voice_sessions')
            .select('total_utterances, total_ms_audio')
            .eq('id', sessionId)
            .eq('user_id', user.id)
            .maybeSingle()

          if (session) {
            await adminClient
              .from('coco_voice_sessions')
              .update({
                total_utterances: (session.total_utterances || 0) + 1,
                total_ms_audio: (session.total_ms_audio || 0) + Math.round(audioFile.size / 16), // rough estimate
              })
              .eq('id', sessionId)
              .eq('user_id', user.id)
          }
        } catch {}
      })
    }

    if (!text) {
      return NextResponse.json({
        ok: true,
        text: '',
        empty: true,
        latency_ms: latencyMs,
      })
    }

    return NextResponse.json({
      ok: true,
      text,
      latency_ms: latencyMs,
      model: 'whisper-large-v3-turbo',
    })
  } catch (err: any) {
    console.error('[COCO Voice] Transcription failed:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'Transcription failed' },
      { status: 500 }
    )
  }
}