// ============================================================
// app/api/coco/health/route.ts
// ============================================================

import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const groqKey = process.env.GROQ_API_KEY
    const hasGroq = Boolean(groqKey && groqKey.trim())
    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY?.trim())

    let groq_test: { ok: boolean; model?: string; detail: string } = {
      ok: false,
      detail: 'not_run',
    }

    if (hasGroq) {
      try {
        const { probeGroq } = await import('@/lib/coco/gateway/providers/groq')
        groq_test = await probeGroq()
      } catch (err: any) {
        groq_test = { ok: false, detail: err?.message || 'probe failed' }
      }
    } else {
      groq_test = { ok: false, detail: 'GROQ_API_KEY missing' }
    }

    let models: unknown = null
    try {
      const m = await import('@/lib/coco/gateway/models')
      models = { configured: m.COCO_GROQ_MODELS, cascade: m.COCO_GROQ_CASCADE }
    } catch {
      models = { error: 'models module missing' }
    }

    let kb: any = { ok: false }
    try {
      const { count: docCount } = await adminClient
        .from('coco_knowledge_docs')
        .select('*', { count: 'exact', head: true })
      const { count: chunkCount } = await adminClient
        .from('coco_knowledge_chunks')
        .select('*', { count: 'exact', head: true })

      kb = {
        ok: true,
        docs: docCount || 0,
        chunks: chunkCount || 0,
        embedding_provider: hasOpenAI ? 'openai' : 'hash_fallback',
      }
    } catch (err: any) {
      kb = { ok: false, error: err?.message }
    }

    const voice = {
      transcription_provider: hasGroq ? 'groq_whisper_large_v3_turbo' : 'unavailable',
      stt_ready: hasGroq,
      tts_provider: 'browser_native',
      notes:
        'STT via Groq Whisper Turbo (free tier). TTS uses the user browser SpeechSynthesis (zero cost).',
    }

    return NextResponse.json({
      status: groq_test.ok ? 'healthy' : hasOpenAI ? 'degraded' : 'unhealthy',
      env: {
        has_groq_key: hasGroq,
        groq_key_preview: hasGroq ? `${groqKey!.slice(0, 7)}...` : null,
        has_openai_key: hasOpenAI,
      },
      models,
      groq_test,
      kb,
      voice,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    return NextResponse.json(
      { status: 'unhealthy', error: err?.message, timestamp: new Date().toISOString() },
      { status: 200 }
    )
  }
}