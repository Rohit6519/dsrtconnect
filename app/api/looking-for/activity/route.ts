import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/activity
// Unified activity: your applications, applications you received, invitations
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limit = Math.min(parseInt(new URL(req.url).searchParams.get('limit') || '40'), 100)

  // 1. Applications I submitted (status changes are events)
  const { data: myApps } = await supabase.from('looking_for_applications')
    .select('id, request_id, venture_lf_id, project_role_id, source_type, pipeline_stage, created_at, stage_updated_at, reviewed_by')
    .eq('applicant_id', user.id)
    .order('stage_updated_at', { ascending: false })
    .limit(50)

  // 2. Applications received on my team_up requests
  const { data: myRequests } = await supabase.from('team_up_requests')
    .select('id, title').eq('user_id', user.id)
  const myRequestIds = (myRequests || []).map(r => r.id)
  const requestTitleMap = new Map((myRequests || []).map(r => [r.id, r.title]))

  const { data: receivedApps } = myRequestIds.length ? await supabase.from('looking_for_applications')
    .select('id, request_id, applicant_id, pipeline_stage, created_at')
    .in('request_id', myRequestIds)
    .order('created_at', { ascending: false })
    .limit(50) : { data: [] }

  // 3. Invitations I received
  const { data: receivedInvites } = await supabase.from('team_up_invitations')
    .select('id, source_type, source_id, from_user_id, message, status, created_at, responded_at')
    .eq('to_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  // 4. Invitations I sent
  const { data: sentInvites } = await supabase.from('team_up_invitations')
    .select('id, source_type, source_id, to_user_id, status, created_at, responded_at')
    .eq('from_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  // 5. Team_up_requests I published (creation events)
  const { data: myPublishedReqs } = await supabase.from('team_up_requests')
    .select('id, title, status, published_at, created_at')
    .eq('user_id', user.id)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(20)

  // Collect all referenced users/opportunities for enrichment
  const userIds = new Set<string>()
  ;(receivedApps || []).forEach(a => userIds.add(a.applicant_id))
  ;(receivedInvites || []).forEach(i => userIds.add(i.from_user_id))
  ;(sentInvites || []).forEach(i => userIds.add(i.to_user_id))

  const { data: users } = userIds.size > 0 ? await supabase.from('users')
    .select('id, username, full_name, avatar_url').in('id', Array.from(userIds)) : { data: [] }
  const userMap = new Map((users || []).map(u => [u.id, u]))

  // Enrich opportunity titles for my applications & invitations
  const oppIds = {
    team_up: new Set<string>(),
    venture_lf: new Set<string>(),
    project_role: new Set<string>(),
  }
  ;[...(myApps || []), ...(receivedInvites || []), ...(sentInvites || [])].forEach((x: any) => {
    if (x.request_id) oppIds.team_up.add(x.request_id)
    if (x.venture_lf_id) oppIds.venture_lf.add(x.venture_lf_id)
    if (x.project_role_id) oppIds.project_role.add(x.project_role_id)
    if (x.source_type === 'team_up' && x.source_id) oppIds.team_up.add(x.source_id)
    if (x.source_type === 'venture_lf' && x.source_id) oppIds.venture_lf.add(x.source_id)
    if (x.source_type === 'project_role' && x.source_id) oppIds.project_role.add(x.source_id)
  })

  const [teamUps, ventureLfs, projectRoles] = await Promise.all([
    oppIds.team_up.size > 0 ? supabase.from('team_up_requests').select('id, title').in('id', Array.from(oppIds.team_up)) : { data: [] },
    oppIds.venture_lf.size > 0 ? supabase.from('venture_looking_for').select('id, title').in('id', Array.from(oppIds.venture_lf)) : { data: [] },
    oppIds.project_role.size > 0 ? supabase.from('project_roles').select('id, role').in('id', Array.from(oppIds.project_role)) : { data: [] },
  ])
  const oppTitleMap = new Map<string, { title: string; type: string }>()
  ;(teamUps.data || []).forEach((t: any) => oppTitleMap.set(`team_up:${t.id}`, { title: t.title, type: 'team_up' }))
  ;(ventureLfs.data || []).forEach((v: any) => oppTitleMap.set(`venture_lf:${v.id}`, { title: v.title, type: 'venture_lf' }))
  ;(projectRoles.data || []).forEach((p: any) => oppTitleMap.set(`project_role:${p.id}`, { title: p.role || 'Team member', type: 'project_role' }))

  // Build events array
  const events: any[] = []

  // My applications — one event per app (with current stage)
  ;(myApps || []).forEach(a => {
    const oppKey = a.request_id ? `team_up:${a.request_id}`
                : a.venture_lf_id ? `venture_lf:${a.venture_lf_id}`
                : a.project_role_id ? `project_role:${a.project_role_id}` : null
    const opp = oppKey ? oppTitleMap.get(oppKey) : null
    const isStageChange = a.stage_updated_at && a.stage_updated_at !== a.created_at
    events.push({
      id: `myapp-${a.id}`,
      type: isStageChange ? 'application_updated' : 'applied',
      timestamp: a.stage_updated_at || a.created_at,
      title: isStageChange
        ? `Your application is ${a.pipeline_stage.replace('_', ' ')}`
        : `You applied to ${opp?.title || 'an opportunity'}`,
      subtitle: opp?.title,
      stage: a.pipeline_stage,
      link: oppKey ? `/looking-for/${oppKey.split(':')[1]}?source=${oppKey.split(':')[0]}` : null,
    })
  })

  // Received applications
  ;(receivedApps || []).forEach(a => {
    const applicant = userMap.get(a.applicant_id)
    const requestTitle = requestTitleMap.get(a.request_id!)
    events.push({
      id: `recapp-${a.id}`,
      type: 'received_application',
      timestamp: a.created_at,
      title: `${applicant?.full_name || 'Someone'} applied to your request`,
      subtitle: requestTitle,
      actor: applicant,
      link: `/looking-for/my-hirings/${a.request_id}?source=team_up`,
    })
  })

  // Received invitations
  ;(receivedInvites || []).forEach(i => {
    const from = userMap.get(i.from_user_id)
    const opp = oppTitleMap.get(`${i.source_type}:${i.source_id}`)
    events.push({
      id: `recinv-${i.id}`,
      type: 'received_invitation',
      timestamp: i.created_at,
      title: `${from?.full_name || 'Someone'} invited you to collaborate`,
      subtitle: opp?.title,
      actor: from,
      inviteStatus: i.status,
      link: `/looking-for/${i.source_id}?source=${i.source_type}`,
    })
    if (i.responded_at && i.status !== 'pending') {
      events.push({
        id: `recinv-resp-${i.id}`,
        type: 'invitation_responded',
        timestamp: i.responded_at,
        title: `You ${i.status} the invitation from ${from?.full_name || 'someone'}`,
        subtitle: opp?.title,
        actor: from,
        inviteStatus: i.status,
        link: `/looking-for/${i.source_id}?source=${i.source_type}`,
      })
    }
  })

  // Sent invitations
  ;(sentInvites || []).forEach(i => {
    const to = userMap.get(i.to_user_id)
    const opp = oppTitleMap.get(`${i.source_type}:${i.source_id}`)
    events.push({
      id: `sentinv-${i.id}`,
      type: 'sent_invitation',
      timestamp: i.created_at,
      title: `You invited ${to?.full_name || 'someone'} to collaborate`,
      subtitle: opp?.title,
      actor: to,
      inviteStatus: i.status,
      link: `/looking-for/${i.source_id}?source=${i.source_type}`,
    })
    if (i.responded_at && (i.status === 'accepted' || i.status === 'declined')) {
      events.push({
        id: `sentinv-resp-${i.id}`,
        type: 'sent_invitation_responded',
        timestamp: i.responded_at,
        title: `${to?.full_name || 'Someone'} ${i.status} your invitation`,
        subtitle: opp?.title,
        actor: to,
        inviteStatus: i.status,
        link: `/looking-for/${i.source_id}?source=${i.source_type}`,
      })
    }
  })

  // Published requests
  ;(myPublishedReqs || []).forEach(r => {
    events.push({
      id: `pub-${r.id}`,
      type: 'published',
      timestamp: r.published_at || r.created_at,
      title: 'You published a team-up request',
      subtitle: r.title,
      link: `/looking-for/${r.id}?source=team_up`,
    })
  })

  // Sort by timestamp desc
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({ events: events.slice(0, limit), total: events.length })
}
