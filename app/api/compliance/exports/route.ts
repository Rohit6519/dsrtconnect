import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditService } from '@/lib/compliance/AuditService'
import { getRequestContext } from '@/lib/compliance/requestContext'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('compliance_export_requests')
    .select('*')
    .eq('requested_by', user.id)
    .order('requested_at', { ascending: false })
    .limit(50)
  return NextResponse.json({ requests: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { scope, entity_id, format = 'json', include_pii = true, include_audit = true, include_messages = true } = body
  if (!scope) return NextResponse.json({ error: 'scope required' }, { status: 400 })

  const { data: inserted, error } = await supabase.from('compliance_export_requests').insert({
    requested_by: user.id,
    scope,
    entity_id: entity_id || null,
    format,
    include_pii,
    include_audit,
    include_messages,
    status: 'queued',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Queue the export job
  await supabase.from('application_workflow_jobs').insert({
    application_id: scope === 'application' ? entity_id : null,
    opportunity_id: scope === 'opportunity' ? entity_id : null,
    job_type: 'run_export',
    payload: { export_id: inserted.id },
    status: 'queued',
    scheduled_for: new Date().toISOString(),
  })

  const ctx = await getRequestContext(req)
  AuditService.record({
    action: 'compliance.export_requested',
    category: 'compliance',
    entity_type: 'export_request',
    entity_id: inserted.id,
    opportunity_id: scope === 'opportunity' ? entity_id : null,
    application_id: scope === 'application' ? entity_id : null,
    actor_id: user.id,
    actor_role: 'owner',
    actor_ip: ctx.actor_ip,
    actor_user_agent: ctx.actor_user_agent,
    source: 'api',
    metadata: { scope, format, include_pii, include_audit, include_messages },
  }).catch(() => {})

  return NextResponse.json({ request: inserted })
}