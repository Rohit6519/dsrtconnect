import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_PRIORITIES = ['required', 'preferred', 'optional']

async function assertOwner(supabase: any, userId: string, oppId: string) {
  const { data } = await supabase
    .from('opportunities')
    .select('poster_user_id')
    .eq('id', oppId)
    .single()
  if (!data) return { ok: false, code: 404 }
  if (data.poster_user_id !== userId) return { ok: false, code: 403 }
  return { ok: true }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const { data, error } = await supabase
    .from('opportunity_skill_requirements')
    .select('*')
    .eq('opportunity_id', id)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ skill_requirements: data || [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const body = await req.json().catch(() => ({}))
  const skill_name = String(body.skill_name || '').trim()
  if (!skill_name) {
    return NextResponse.json({ error: 'skill_name required' }, { status: 400 })
  }

  const priority = VALID_PRIORITIES.includes(body.priority)
    ? body.priority
    : 'required'

  const { data: existing } = await supabase
    .from('opportunity_skill_requirements')
    .select('order_index')
    .eq('opportunity_id', id)
    .order('order_index', { ascending: false })
    .limit(1)

  const nextOrder =
    existing && existing.length > 0 ? (existing[0].order_index || 0) + 1 : 0

  const { data, error } = await supabase
    .from('opportunity_skill_requirements')
    .insert({
      opportunity_id: id,
      skill_id: body.skill_id || null,
      skill_name,
      priority,
      evidence_types: Array.isArray(body.evidence_types) ? body.evidence_types : [],
      min_years: body.min_years || null,
      order_index: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await syncLegacySkills(supabase, id)
  return NextResponse.json({ skill_requirement: data })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const body = await req.json().catch(() => ({}))
  const skill_req_id = String(body.skill_req_id || '')
  if (!skill_req_id) {
    return NextResponse.json({ error: 'skill_req_id required' }, { status: 400 })
  }

  const patch: any = {}
  if (body.priority && VALID_PRIORITIES.includes(body.priority)) {
    patch.priority = body.priority
  }
  if (body.min_years !== undefined) patch.min_years = body.min_years
  if (Array.isArray(body.evidence_types)) patch.evidence_types = body.evidence_types

  const { data, error } = await supabase
    .from('opportunity_skill_requirements')
    .update(patch)
    .eq('id', skill_req_id)
    .eq('opportunity_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncLegacySkills(supabase, id)
  return NextResponse.json({ skill_requirement: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const skill_req_id = new URL(req.url).searchParams.get('skill_req_id')
  if (!skill_req_id) {
    return NextResponse.json({ error: 'skill_req_id required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('opportunity_skill_requirements')
    .delete()
    .eq('id', skill_req_id)
    .eq('opportunity_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await syncLegacySkills(supabase, id)
  return NextResponse.json({ ok: true })
}

async function syncLegacySkills(supabase: any, opportunityId: string) {
  const { data: reqs } = await supabase
    .from('opportunity_skill_requirements')
    .select('skill_name, priority')
    .eq('opportunity_id', opportunityId)

  const required: string[] = []
  const preferred: string[] = []

  for (const r of reqs || []) {
    if (r.priority === 'required') required.push(r.skill_name)
    else if (r.priority === 'preferred') preferred.push(r.skill_name)
  }

  await supabase
    .from('opportunities')
    .update({
      required_skills: required,
      preferred_skills: preferred,
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', opportunityId)
}