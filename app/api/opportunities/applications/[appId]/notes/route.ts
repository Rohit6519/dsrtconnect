// Path: app/api/opportunities/applications/[appId]/notes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/compliance/AuditService'
import { getRequestContext } from '@/lib/compliance/requestContext'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const reqCtx = await getRequestContext(req)
  if (!reqCtx.actor_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const text = String(body.body || '').trim()
  if (!text) return NextResponse.json({ error: 'Note text required' }, { status: 400 })

  const { data: app } = await supabase.from('opportunity_applications')
    .select('id, opportunity_id').eq('id', appId).single()
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: note, error } = await supabase.from('application_internal_notes').insert({
    application_id: app.id,
    opportunity_id: app.opportunity_id,
    author_id: reqCtx.actor_id,
    body: text.slice(0, 4000),
  }).select('*, author:users!author_id(id, full_name, username, avatar_url)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 🔑 AUDIT RECORD CALL
  AuditService.record({
    action: 'note.added',
    category: 'note',
    entity_type: 'application_internal_note',
    entity_id: note.id,
    opportunity_id: app.opportunity_id,
    application_id: app.id,
    actor_id: reqCtx.actor_id,
    actor_role: 'owner',
    actor_ip: reqCtx.actor_ip,
    actor_user_agent: reqCtx.actor_user_agent,
    source: 'api',
    metadata: { chars: text.length },
  }).catch(() => {})

  return NextResponse.json({ note })
}