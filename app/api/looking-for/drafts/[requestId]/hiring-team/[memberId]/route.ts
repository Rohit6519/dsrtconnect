import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; memberId: string }> }
) {
  const { requestId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: reqRow } = await supabase.from('team_up_requests')
    .select('user_id').eq('id', requestId).eq('user_id', user.id).maybeSingle()
  if (!reqRow) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { role } = body
  if (!role) return NextResponse.json({ error: 'role required' }, { status: 400 })

  const perms = permissionsForRole(role)
  const { data, error } = await supabase.from('team_up_hiring_team')
    .update({ role, ...perms })
    .eq('id', memberId)
    .eq('request_id', requestId)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; memberId: string }> }
) {
  const { requestId, memberId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: reqRow } = await supabase.from('team_up_requests')
    .select('user_id').eq('id', requestId).eq('user_id', user.id).maybeSingle()
  if (!reqRow) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })

  const { error } = await supabase.from('team_up_hiring_team')
    .delete().eq('id', memberId).eq('request_id', requestId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
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
