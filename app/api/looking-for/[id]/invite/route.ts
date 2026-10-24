import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/looking-for/[id]/invite
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { to_user_id, message, source_type = 'team_up' } = body

  if (!to_user_id) return NextResponse.json({ error: 'to_user_id required' }, { status: 400 })
  if (to_user_id === user.id) return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 })

  if (source_type === 'team_up') {
    const { data: req } = await supabase.from('team_up_requests').select('user_id').eq('id', id).single()
    if (!req || req.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else if (source_type === 'venture_lf') {
    const { data: vlf } = await supabase.from('venture_looking_for').select('venture_id').eq('id', id).single()
    if (vlf) {
      const { data: vent } = await supabase.from('ventures').select('user_id').eq('id', vlf.venture_id).single()
      if (!vent || vent.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } else if (source_type === 'project_role') {
    const { data: role } = await supabase.from('project_roles').select('project_id').eq('id', id).single()
    if (role) {
      const { data: proj } = await supabase.from('projects').select('founder_id, user_id').eq('id', role.project_id).single()
      if (!proj || (proj.founder_id !== user.id && proj.user_id !== user.id))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data, error } = await supabase.from('team_up_invitations').insert({
    source_type, source_id: id,
    from_user_id: user.id, to_user_id, message,
  }).select().single()

  if (error && error.code === '23505')
    return NextResponse.json({ error: 'Already invited' }, { status: 409 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invitation: data }, { status: 201 })
}

// PATCH /api/looking-for/[id]/invite — respond to invitation
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { status, response_note } = body

  if (!['accepted', 'declined'].includes(status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  const { data, error } = await supabase.from('team_up_invitations')
    .update({ status, response_note, responded_at: new Date().toISOString() })
    .eq('id', id).eq('to_user_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitation: data })
}
