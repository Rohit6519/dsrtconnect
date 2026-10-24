import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

const CORE_KEYS = ['submitted', 'under-review', 'shortlisted', 'interview', 'offer', 'accepted', 'declined', 'withdrawn']

async function assertManager(supabase: any, userId: string, oppId: string, allowReviewer = false) {
  const { data: opp } = await supabase.from('opportunities').select('poster_user_id').eq('id', oppId).single()
  if (!opp) return { ok: false, code: 404 }
  if (opp.poster_user_id === userId) return { ok: true, isOwner: true }
  const { data: m } = await supabase
    .from('opportunity_members')
    .select('role')
    .eq('opportunity_id', oppId)
    .eq('user_id', userId)
    .maybeSingle()
  const roles = allowReviewer ? ['owner', 'admin', 'manager', 'reviewer'] : ['owner', 'admin', 'manager']
  if (m && roles.includes((m as any).role)) return { ok: true, isOwner: false }
  return { ok: false, code: 403 }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id, true)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const { data, error } = await supabase
    .from('opportunity_pipeline_stages')
    .select('*')
    .eq('opportunity_id', id)
    .order('order_index', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stages: data || [] })
}

/**
 * POST — create a new stage.
 * body: { stage_key, name, order_index?, category? }
 * stage_key must be unique per opportunity. Custom keys allowed (kebab-case).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const body = await req.json().catch(() => ({}))
  const stage_key = String(body.stage_key || '').trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-')
  const name = String(body.name || '').trim()
  const order_index = Number.isFinite(body.order_index) ? Number(body.order_index) : 999
  const category = ['progress', 'terminal_positive', 'terminal_negative'].includes(body.category) ? body.category : 'progress'

  if (!stage_key || !name) return NextResponse.json({ error: 'stage_key and name required' }, { status: 400 })

  const { data, error } = await supabase
    .from('opportunity_pipeline_stages')
    .insert({ opportunity_id: id, stage_key, name, order_index, category, is_default: false })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Stage key already exists' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeOpportunityAudit({
    opportunity_id: id,
    actor_id: user.id,
    action: 'pipeline_stage_added',
    target_type: 'pipeline_stage',
    target_id: data.id,
    after_state: { stage_key, name, order_index, category },
  }).catch(() => {})

  return NextResponse.json({ stage: data })
}

/**
 * PATCH — update multiple stages at once.
 * body: { updates: [{ id, name?, order_index?, category? }] }
 * stage_key is immutable.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const body = await req.json().catch(() => ({}))
  const updates: any[] = Array.isArray(body.updates) ? body.updates : []
  if (updates.length === 0) return NextResponse.json({ ok: true, updated: 0 })

  let updated = 0
  for (const u of updates) {
    if (!u?.id) continue
    const patch: any = {}
    if (typeof u.name === 'string' && u.name.trim()) patch.name = u.name.trim()
    if (Number.isFinite(u.order_index)) patch.order_index = Number(u.order_index)
    if (['progress', 'terminal_positive', 'terminal_negative'].includes(u.category)) patch.category = u.category
    if (Object.keys(patch).length === 0) continue

    const { error } = await supabase
      .from('opportunity_pipeline_stages')
      .update(patch)
      .eq('id', u.id)
      .eq('opportunity_id', id)
    if (!error) updated++
  }

  await writeOpportunityAudit({
    opportunity_id: id,
    actor_id: user.id,
    action: 'pipeline_stages_updated',
    target_type: 'pipeline_stage',
    after_state: { updated_ids: updates.map(u => u.id) },
  }).catch(() => {})

  return NextResponse.json({ ok: true, updated })
}

/**
 * DELETE — remove a stage.
 * ?stage_id=<uuid>
 * Cannot delete core stages required by counters (submitted/under-review/shortlisted/interview/accepted/declined/withdrawn/offer).
 * Cannot delete a stage that has applications currently in it.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const stage_id = new URL(req.url).searchParams.get('stage_id')
  if (!stage_id) return NextResponse.json({ error: 'stage_id required' }, { status: 400 })

  const { data: stage } = await supabase
    .from('opportunity_pipeline_stages')
    .select('id, stage_key')
    .eq('id', stage_id)
    .eq('opportunity_id', id)
    .single()

  if (!stage) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (CORE_KEYS.includes(stage.stage_key)) {
    return NextResponse.json({ error: 'Core stages cannot be deleted. Rename instead.' }, { status: 400 })
  }

  // Block delete if apps sit in this stage
  const { count } = await supabase
    .from('opportunity_applications')
    .select('id', { count: 'exact', head: true })
    .eq('opportunity_id', id)
    .eq('pipeline_stage', stage.stage_key)

  if ((count || 0) > 0) {
    return NextResponse.json({ error: 'Move applicants out of this stage first' }, { status: 409 })
  }

  const { error } = await supabase
    .from('opportunity_pipeline_stages')
    .delete()
    .eq('id', stage_id)
    .eq('opportunity_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeOpportunityAudit({
    opportunity_id: id,
    actor_id: user.id,
    action: 'pipeline_stage_removed',
    target_type: 'pipeline_stage',
    target_id: stage_id,
    before_state: { stage_key: stage.stage_key },
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}