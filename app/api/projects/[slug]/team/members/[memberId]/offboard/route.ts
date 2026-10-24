import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; memberId: string }> }
) {
  const { slug, memberId } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    // 1. Authenticate owner
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    
    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 2. Fetch target member
    const { data: member } = await supabase
      .from('project_members')
      .select('id, user_id, member_state')
      .eq('id', memberId)
      .eq('project_id', project.id)
      .single()

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    if (member.member_state === 'removed') return NextResponse.json({ error: 'Already removed' }, { status: 400 })
    if (member.user_id === user.id) return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })

    // 3. Reassign Active Objectives
    if (body.reassign_to_member_id) {
      await supabase
        .from('project_team_objectives')
        .update({ owner_member_id: body.reassign_to_member_id })
        .eq('owner_member_id', member.id)
        .in('status', ['assigned', 'in_progress', 'blocked', 'awaiting_review'])
    }

    // 4. Update Member State
    await supabase
      .from('project_members')
      .update({
        member_state: 'removed',
        role: null, // Clear role so they drop off active lists immediately
        updated_at: new Date().toISOString()
      })
      .eq('id', member.id)

    // 5. Revoke Permissions (if requested)
    if (body.revoke_access) {
      await supabase
        .from('project_permissions')
        .delete()
        .eq('project_id', project.id)
        .eq('user_id', member.user_id)
    }

    // 6. Log Audit Event
    await supabase.rpc('log_team_activity', {
      p_project_id: project.id,
      p_actor_id: user.id,
      p_subject_member_id: member.id,
      p_event_type: 'member_removed',
      p_title: 'Member offboarded',
      p_summary: body.reason || 'No reason provided',
      p_metadata: {
        reassigned_to: body.reassign_to_member_id,
        access_revoked: !!body.revoke_access
      }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[offboard:POST] Fatal:', error)
    return NextResponse.json({ error: error.message || 'Failed to offboard member' }, { status: 500 })
  }
}