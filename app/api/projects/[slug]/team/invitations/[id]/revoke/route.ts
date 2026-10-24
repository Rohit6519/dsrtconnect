import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: project } = await supabase.from('projects').select('id, founder_id, user_id').eq('slug', slug).single()
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: invite } = await supabase.from('project_team_invitations').select('id, state').eq('id', id).eq('project_id', project.id).single()
    if (!invite) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })

    if (['accepted', 'completed'].includes(invite.state)) {
      return NextResponse.json({ error: 'Cannot revoke an accepted invitation' }, { status: 400 })
    }

    await supabase.from('project_team_invitations').update({
      state: 'revoked',
      revoked_at: new Date().toISOString(),
      revoked_by: user.id
    }).eq('id', id)

    // Audit log
    await supabase.from('project_team_invitation_events').insert({
      invitation_id: id,
      event_type: 'revoked',
      from_state: invite.state,
      to_state: 'revoked',
      actor_id: user.id
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to revoke' }, { status: 500 })
  }
}