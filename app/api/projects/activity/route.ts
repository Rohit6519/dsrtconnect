import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Aggregates activity from multiple sources across all user's projects
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized', activity: [] }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100)

  try {
    // Get all projects owned by user (needed to aggregate related activity)
    const { data: ownedProjects } = await supabase
      .from('projects')
      .select('id, name, slug, icon, color, project_number')
      .or('founder_id.eq.' + user.id + ',user_id.eq.' + user.id)

    const projectIds = (ownedProjects || []).map(p => p.id)
    const projectMap = new Map((ownedProjects || []).map(p => [p.id, p]))

    if (projectIds.length === 0) {
      return NextResponse.json({ activity: [] })
    }

    // Fetch from multiple sources IN PARALLEL
    const [
      projectActivityRes,
      applicationsRes,
      followsRes,
      savesRes,
      commentsRes,
      updatesRes,
      newMembersRes,
    ] = await Promise.all([
      // 1. Direct project_activity feed (already curated)
      supabase
        .from('project_activity')
        .select('*, actor:users!project_activity_actor_id_fkey(id, full_name, username, avatar_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20),

      // 2. New role applications on user's projects
      supabase
        .from('project_role_applications')
        .select('id, created_at, status, project_id, role_id, applicant:users!project_role_applications_applicant_id_fkey(id, full_name, username, avatar_url), role:project_roles!project_role_applications_role_id_fkey(id, title)')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10),

      // 3. New follows on user's projects
      supabase
        .from('follows')
        .select('id, created_at, follower_id, following_id, user:users!follows_follower_id_fkey(id, full_name, username, avatar_url)')
        .eq('following_type', 'project')
        .in('following_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10),

      // 4. New saves on user's projects
      supabase
        .from('project_saves')
        .select('user_id, project_id, saved_at, user:users!project_saves_user_id_fkey(id, full_name, username, avatar_url)')
        .in('project_id', projectIds)
        .order('saved_at', { ascending: false })
        .limit(10),

      // 5. New comments on user's project posts
      supabase
        .from('post_comments')
        .select('id, created_at, content, post_id, user:users!post_comments_user_id_fkey(id, full_name, username, avatar_url), post:posts!post_comments_post_id_fkey(id, project_id, title)')
        .in('post.project_id', projectIds)
        .order('created_at', { ascending: false })
        .limit(10),

      // 6. Recent updates posted (team members posting to your project)
      supabase
        .from('posts')
        .select('id, created_at, title, content, project_id, update_type, user_id, user:users!posts_user_id_fkey(id, full_name, username, avatar_url)')
        .in('project_id', projectIds)
        .eq('type', 'update')
        .order('created_at', { ascending: false })
        .limit(10),

      // 7. New team members joining
      supabase
        .from('project_members')
        .select('id, joined_at, role, project_id, user_id, user:users!project_members_user_id_fkey(id, full_name, username, avatar_url)')
        .in('project_id', projectIds)
        .order('joined_at', { ascending: false })
        .limit(10),
    ])

    // ─── Normalize everything into unified event objects ───
    type Event = {
      id: string
      type: string
      title: string
      subtitle?: string | null
      created_at: string
      icon_type: string
      actor: { id: string; full_name: string | null; username: string | null; avatar_url: string | null } | null
      project: { id: string; name: string; slug: string; icon: string; color: string; project_number: string } | null
      entity_url?: string | null
      entity_label?: string | null
      metadata?: any
    }

    const events: Event[] = []

    // 1. project_activity events (already have good structure)
    for (const a of (projectActivityRes.data || []) as any[]) {
      const proj = projectMap.get(a.project_id) as any
      events.push({
        id: 'pa-' + a.id,
        type: a.type,
        title: a.title,
        subtitle: a.subtitle,
        created_at: a.created_at,
        icon_type: a.type,
        actor: a.actor || null,
        project: proj || null,
        entity_url: a.entity_type && a.entity_id ? '#' : null,
        entity_label: null,
        metadata: a.metadata,
      })
    }

    // 2. Applications
    for (const app of (applicationsRes.data || []) as any[]) {
      const proj = projectMap.get(app.project_id) as any
      const applicant = app.applicant
      const roleTitle = app.role?.title || 'a role'
      events.push({
        id: 'app-' + app.id,
        type: 'role_application',
        title: (applicant?.full_name || 'Someone') + ' applied for ' + roleTitle,
        subtitle: 'Status: ' + app.status,
        created_at: app.created_at,
        icon_type: 'role_application',
        actor: applicant || null,
        project: proj || null,
        entity_url: proj ? '/projects/' + proj.slug + '?tab=applicants' : null,
        entity_label: 'Review',
      })
    }

    // 3. Follows
    for (const f of (followsRes.data || []) as any[]) {
      const proj = projectMap.get(f.following_id) as any
      events.push({
        id: 'follow-' + f.id,
        type: 'new_follower',
        title: (f.user?.full_name || 'Someone') + ' followed your project',
        subtitle: null,
        created_at: f.created_at,
        icon_type: 'new_follower',
        actor: f.user || null,
        project: proj || null,
        entity_url: f.user?.username ? '/profile/' + f.user.username : null,
        entity_label: 'View profile',
      })
    }

    // 4. Saves
    for (const s of (savesRes.data || []) as any[]) {
      const proj = projectMap.get(s.project_id) as any
      events.push({
        id: 'save-' + s.user_id + '-' + s.project_id,
        type: 'project_saved',
        title: (s.user?.full_name || 'Someone') + ' saved your project',
        subtitle: null,
        created_at: s.saved_at,
        icon_type: 'project_saved',
        actor: s.user || null,
        project: proj || null,
        entity_url: s.user?.username ? '/profile/' + s.user.username : null,
        entity_label: 'View profile',
      })
    }

    // 5. Comments
    for (const c of (commentsRes.data || []) as any[]) {
      if (!c.post?.project_id || !projectIds.includes(c.post.project_id)) continue
      const proj = projectMap.get(c.post.project_id) as any
      events.push({
        id: 'cmt-' + c.id,
        type: 'comment',
        title: (c.user?.full_name || 'Someone') + ' commented on your update',
        subtitle: (c.content || '').slice(0, 80),
        created_at: c.created_at,
        icon_type: 'comment',
        actor: c.user || null,
        project: proj || null,
        entity_url: proj ? '/projects/' + proj.slug : null,
        entity_label: 'Reply',
      })
    }

    // 6. Updates posted by team members (not self)
    for (const u of (updatesRes.data || []) as any[]) {
      if (u.user_id === user.id) continue
      const proj = projectMap.get(u.project_id) as any
      events.push({
        id: 'upd-' + u.id,
        type: 'update_published',
        title: (u.user?.full_name || 'Someone') + ' posted "' + (u.title || (u.content || '').slice(0, 60)) + '"',
        subtitle: u.update_type,
        created_at: u.created_at,
        icon_type: 'update_published',
        actor: u.user || null,
        project: proj || null,
        entity_url: proj ? '/projects/' + proj.slug + '#update-' + u.id : null,
        entity_label: 'View update',
      })
    }

    // 7. New team members
    for (const m of (newMembersRes.data || []) as any[]) {
      if (m.user_id === user.id) continue
      const proj = projectMap.get(m.project_id) as any
      events.push({
        id: 'mem-' + m.id,
        type: 'member_joined',
        title: (m.user?.full_name || 'Someone') + ' joined as ' + (m.role || 'member'),
        subtitle: null,
        created_at: m.joined_at,
        icon_type: 'member_joined',
        actor: m.user || null,
        project: proj || null,
        entity_url: m.user?.username ? '/profile/' + m.user.username : null,
        entity_label: 'View profile',
      })
    }

    // ─── Deduplicate + sort by newest ───
    const seen = new Set<string>()
    const deduped = events.filter(e => {
      if (seen.has(e.id)) return false
      seen.add(e.id)
      return true
    })

    deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      activity: deduped.slice(0, limit),
      count: deduped.length,
    })
  } catch (error: any) {
    console.error('Activity aggregation error:', error)
    return NextResponse.json({ error: error?.message, activity: [] }, { status: 500 })
  }
}
