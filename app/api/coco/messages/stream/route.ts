// ============================================================
// app/api/coco/messages/stream/route.ts
// The primary COCO SSE Streaming endpoint.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

import { compileContext } from '@/lib/coco/context'
import { classifyIntent, runAgentTurn } from '@/lib/coco/agent'
import { createSseResponse } from '@/lib/coco/streaming/sse'
import { ensureConversation, saveMessage, getConversationHistory } from '@/lib/coco/messages/store'
import type { SendMessageRequest } from '@/types/coco'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const requestId = randomUUID()
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: SendMessageRequest = await req.json()
    if (!body.text || !body.context_hint) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Ensure Conversation exists
    const conversationId = await ensureConversation(user.id, body.conversation_id)

    // 2. Compile Server-Verified Context Envelope
    const { envelope, snapshotId } = await compileContext({
      userId: user.id,
      conversationId,
      rawHint: body.context_hint,
      userMessage: body.text
    })

    // 3. Save User Message
    await saveMessage({
      userId: user.id,
      conversationId,
      role: 'user',
      type: 'text',
      content: { kind: 'text', text: body.text },
      contextSnapshotId: snapshotId || undefined
    })

    // 4. Fetch recent history
    const history = await getConversationHistory(conversationId)

    // 5. Classify Intent
    const taskClass = await classifyIntent(body.text, user.id, conversationId, requestId)

    // 6. Run Agent & Return Stream
    const agentStream = runAgentTurn({
      userId: user.id,
      conversationId,
      requestId,
      userMessage: body.text,
      history: history as any[],
      context: envelope,
      taskClass
    })

    return createSseResponse(agentStream)

  } catch (err: any) {
    console.error('[COCO API] Stream error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}