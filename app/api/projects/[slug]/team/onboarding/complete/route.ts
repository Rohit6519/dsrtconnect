import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
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
    const { data: project } = await supabase.from('projects').select('id, name').eq('slug', slug).single()
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: member } = await supabase
      .from('project_members')
      .select('id, member_state')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .single()

    if (!member || member.member_state !== 'onboarding') {
      return NextResponse.json({ error: 'Invalid state' }, { status: 403 })
    }

    const { data: onboarding } = await supabase
      .from('project_team_onboarding')
      .select('*, invitation:project_team_invitations(snapshot, id)')
      .eq('member_id', member.id)
      .single()

    const snapshot = onboarding?.invitation?.snapshot || {}

    // 1. Create Work Plan
    const { data: plan } = await supabase.from('project_team_work_plans').insert({
      project_id: project.id,
      member_id: member.id,
      status: body.workPlanResponse === 'suggested_changes' ? 'revised' : 'active',
      member_response: body.workPlanResponse || 'accepted',
      notes: body.workPlanNotes || null
    }).select('id').single()

    // 2. Create Objectives
    if (plan && Array.isArray(snapshot.work_plan?.objectives)) {
      const objs = snapshot.work_plan.objectives.map((o: any, i: number) => ({
        project_id: project.id,
        work_plan_id: plan.id,
        title: o.title,
        priority: o.priority,
        due_date: o.due_date,
        owner_member_id: member.id,
        status: body.workPlanResponse === 'suggested_changes' ? 'awaiting_review' : 'assigned',
        sort_order: i
      }))
      if (objs.length > 0) await supabase.from('project_team_objectives').insert(objs)
    }

    // 3. Create Responsibilities (Create global dict entries if missing, then link)
    if (Array.isArray(snapshot.responsibilities)) {
      for (const r of snapshot.responsibilities) {
        let respId = null
        // Find or create responsibility catalog entry
        const { data: existingResp } = await supabase.from('project_team_responsibilities')
          .select('id').eq('project_id', project.id).eq('title', r.title).maybeSingle()
        
        if (existingResp) {
          respId = existingResp.id
        } else {
          const { data: newResp } = await supabase.from('project_team_responsibilities')
            .insert({ project_id: project.id, title: r.title }).select('id').single()
          respId = newResp?.id
        }

        if (respId) {
          await supabase.from('project_team_member_responsibilities').insert({
            project_id: project.id,
            member_id: member.id,
            responsibility_id: respId,
            is_primary: r.is_primary || false
          })
        }
      }
    }

    // 4. Update Member Status
    await supabase.from('project_members').update({
      member_state: 'active',
      onboarding_complete: true
    }).eq('id', member.id)

    // 5. Update Onboarding Shell
    await supabase.from('project_team_onboarding').update({
      current_step: 'complete',
      completed_at: new Date().toISOString()
    }).eq('id', onboarding.id)

    // 6. Log Activity
    await supabase.rpc('log_team_activity', {
      p_project_id: project.id,
      p_actor_id: user.id,
      p_subject_member_id: member.id,
      p_event_type: 'onboarding_completed',
      p_title: `${user.user_metadata?.full_name || 'Member'} completed onboarding`,
      p_summary: `Work plan ${body.workPlanResponse === 'suggested_changes' ? 'needs review' : 'accepted'}`
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[onboarding:complete] Fatal:', e)
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}