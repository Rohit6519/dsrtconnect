// ============================================================
// lib/coco/streaming/sse.ts
// Converts an AsyncGenerator of CocoStreamEvents into an SSE Response.
// ============================================================

import { NextResponse } from 'next/server'
import type { CocoStreamEvent } from '@/types/coco'

export function createSseResponse(generator: AsyncGenerator<CocoStreamEvent>): NextResponse {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of generator) {
          // SSE format: data: {json}\n\n
          const payload = JSON.stringify(event)
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`))
        }
      } catch (err: any) {
        console.error('[COCO SSE] Stream error:', err)
        const errorEvent: CocoStreamEvent = {
          event: 'error',
          request_id: 'internal',
          timestamp: new Date().toISOString(),
          data: { code: 'COCO_STREAM_FAILED', message: err.message || 'Stream interrupted' }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // Important for Nginx/Vercel to not buffer the stream
    }
  })
}