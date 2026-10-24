import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [draftRes, reqRes] = await Promise.all([
    supabase.from('team_up_drafts').select('user_id, request_id').eq('id', requestId).eq('user_id', user.id).maybeSingle(),
    supabase.from('team_up_requests').select('user_id').eq('id', requestId).eq('user_id', user.id).maybeSingle(),
  ])

  if (!draftRes.data && !reqRes.data) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const finalRequestId = reqRes.data ? requestId : (draftRes.data?.request_id || null)
  if (!finalRequestId) {
    return NextResponse.json({ members: [] })
  }

  const { data: members } = await supabase
    .from('team_up_hiring_team')
    .select('*')
    .eq('request_id', finalRequestId)
    .order('added_at', { ascending: true })

  const userIds = (members || []).map((m: any) => m.user_id)
  const { data: users } = userIds.length
    ? await supabase.from('users').select('id, username, full_name, avatar_url, tagline').in('id', userIds)
    : { data: [] as any[] }
  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  return NextResponse.json({
    members: (members || []).map((m: any) => ({ ...m, user: userMap.get(m.user_id) })),
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { user_id, role = 'reviewer' } = body
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const [draftRes, reqRes] = await Promise.all([
    supabase.from('team_up_drafts').select('user_id, request_id').eq('id', requestId).eq('user_id', user.id).maybeSingle(),
    supabase.from('team_up_requests').select('user_id').eq('id', requestId).eq('user_id', user.id).maybeSingle(),
  ])
  if (!draftRes.data && !reqRes.data) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }
  const finalRequestId = reqRes.data ? requestId : (draftRes.data?.request_id || null)
  if (!finalRequestId) {
    return NextResponse.json({ error: 'Publish the draft first to add hiring team' }, { status: 400 })
  }

  const perms = permissionsForRole(role)
  const { data, error } = await supabase.from('team_up_hiring_team').insert({
    request_id: finalRequestId,
    user_id,
    role,
    added_by: user.id,
    ...perms,
  }).select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Already added' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ member: data }, { status: 201 })
}

function permissionsForRole(role: string) {
  switch (role) {
    case 'owner':
      return { can_view: true, can_review: true, can_message: true, can_change_status: true, can_accept: true, can_reject: true, can_edit: true }
    case 'manager':
      return { can_view: true, can_review: true, can_message: true, can_change_status: true, can_accept: true, can_reject: true, can_edit: false }
    case 'reviewer':
      return { can_view: true, can_review: true, can_message: true, can_change_status: false, can_accept: false, can_reject: false, can_edit: false }
    case 'viewer':
    default:
      return { can_view: true, can_review: false, can_message: false, can_change_status: false, can_accept: false, can_reject: false, can_edit: false }
  }
}
