import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userEmail = user.email || ''

  const [orgInvites, commInvites, projectInvites, connectionRequests] = await Promise.all([
    // Organization invitations (by user_id or email)
    supabase
      .from('organization_invitations')
      .select(`
        id, message, role, status, created_at, expires_at, token,
        organizations:organization_id (id, name, slug, logo_url, description),
        inviter:invited_by (id, full_name, username, avatar_url)
      `)
      .or(`invited_user_id.eq.${user.id},invited_email.eq.${userEmail}`)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),

    // Community invitations
    supabase
      .from('community_invitations')
      .select(`
        id, message, role, status, created_at, expires_at, token,
        communities:community_id (id, name, slug, cover_url, description, member_count),
        inviter:invited_by (id, full_name, username, avatar_url)
      `)
      .or(`invited_user_id.eq.${user.id},invited_email.eq.${userEmail}`)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),

    // Project invitations
    supabase
      .from('project_invitations')
      .select(`
        id, role, status, created_at, expires_at, token,
        projects:project_id (id, name, slug, description, icon, color),
        inviter:invited_by (id, full_name, username, avatar_url)
      `)
      .or(`invited_user_id.eq.${user.id},invited_email.eq.${userEmail}`)
      .eq('status', 'pending')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),

    // Builder connection requests (pending)
    supabase
      .from('builder_connections')
      .select(`
        id, message, status, created_at,
        requester:requester_id (id, full_name, username, avatar_url, tagline)
      `)
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  return NextResponse.json({
    organizations: orgInvites.data || [],
    communities: commInvites.data || [],
    projects: projectInvites.data || [],
    connections: connectionRequests.data || [],
    total: (orgInvites.data?.length || 0) +
           (commInvites.data?.length || 0) +
           (projectInvites.data?.length || 0) +
           (connectionRequests.data?.length || 0),
  })
}