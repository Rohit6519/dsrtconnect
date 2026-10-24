import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'manager', 'reviewer', 'viewer']

async function assertOwner(supabase: any, userId: string, oppId: string) {
  const { data: opp } = await supabase.from('opportunities').select('poster_user_id').eq('id', oppId).single()
  if (!opp) return { ok: false, code: 404 }
  if (opp.poster_user_id !== userId) return { ok: false, code: 403 }
  return { ok: true, poster_user_id: opp.poster_user_id }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opp } = await supabase.from('opportunities').select('poster_user_id').eq('id', id).single()
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let canRead = opp.poster_user_id === user.id
  if (!canRead) {
    const { data: self } = await supabase
      .from('opportunity_members').select('role').eq('opportunity_id', id).eq('user_id', user.id).maybeSingle()
    canRead = !!self
  }
  if (!canRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: members, error } = await supabase
    .from('opportunity_members')
    .select('id, user_id, role, invited_at, accepted_at')
    .eq('opportunity_id', id)
    .order('invited_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = [...new Set([opp.poster_user_id, ...(members || []).map((m: any) => m.user_id)])]
  const { data: users } = ids.length
    ? await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', ids)
    : { data: [] as any[] }

  const uMap = new Map((users || []).map((u: any) => [u.id, u]))

  const owner = {
    id: `owner:${opp.poster_user_id}`,
    user_id: opp.poster_user_id,
    role: 'owner',
    invited_at: null,
    accepted_at: null,
    profile: uMap.get(opp.poster_user_id) || null,
  }

  const rows = (members || []).map((m: any) => ({
    ...m,
    profile: uMap.get(m.user_id) || null,
  }))

  return NextResponse.json({ owner, members: rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const body = await req.json().catch(() => ({}))
  const role = String(body.role || 'reviewer')
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  let targetId: string | null = body.user_id || null
  const rawUsername = (body.username || '').toString().trim().replace(/^@/, '')

  // Lookup user if user_id wasn't provided directly
  if (!targetId && rawUsername) {
    const { data: foundUser } = await supabase
      .from('users')
      .select('id')
      .or(`username.ilike.${rawUsername},email.ilike.${rawUsername},full_name.ilike.${rawUsername}`)
      .maybeSingle()

    if (!foundUser) {
      return NextResponse.json({ error: `User "@${rawUsername}" not found in system.` }, { status: 404 })
    }
    targetId = foundUser.id
  }

  if (!targetId) {
    return NextResponse.json({ error: 'user_id or username required' }, { status: 400 })
  }
  if (targetId === gate.poster_user_id) {
    return NextResponse.json({ error: 'Owner cannot be added as member' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('opportunity_members')
    .upsert({
      opportunity_id: id,
      user_id: targetId,
      role,
      invited_by: user.id,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    }, { onConflict: 'opportunity_id,user_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeOpportunityAudit({
    opportunity_id: id,
    actor_id: user.id,
    action: 'member_added',
    target_type: 'member',
    target_id: data.id,
    after_state: { user_id: targetId, role },
  }).catch(() => {})

  return NextResponse.json({ member: data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const body = await req.json().catch(() => ({}))
  const member_id = String(body.member_id || '')
  const role = String(body.role || '')
  if (!member_id || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'member_id and valid role required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('opportunity_members')
    .update({ role })
    .eq('id', member_id)
    .eq('opportunity_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ member: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const member_id = new URL(req.url).searchParams.get('member_id')
  if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('opportunity_members').select('*').eq('id', member_id).eq('opportunity_id', id).single()

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await supabase.from('opportunity_members').delete().eq('id', member_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('opportunity_application_reviewers')
    .delete()
    .eq('opportunity_id', id)
    .eq('reviewer_id', existing.user_id)

  return NextResponse.json({ ok: true })
}