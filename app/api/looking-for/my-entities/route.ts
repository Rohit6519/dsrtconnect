import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/my-entities
// Returns entities the current user has permission to post opportunities from.
// Only returns entities where user is founder/owner/admin — no false surfacing.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [projectsRes, venturesRes, orgsRes] = await Promise.all([
    // Projects: founder or creator
    supabase.from('projects')
      .select('id, slug, name, tagline, logo_url, icon, is_public, status')
      .or(`founder_id.eq.${user.id},user_id.eq.${user.id}`)
      .neq('status', 'archived')
      .order('last_activity_at', { ascending: false })
      .limit(50),

    // Ventures: founder or creator
    supabase.from('ventures')
      .select('id, slug, name, tagline, logo_url, is_verified, status')
      .or(`user_id.eq.${user.id},founder_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50),

    // Organizations: user is admin/owner via organization_members
    supabase.from('organization_members')
      .select('role, organization_id, organizations(id, slug, name, logo_url, tagline, is_verified)')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'leader'])
      .eq('status', 'active'),
  ])

  const organizations = (orgsRes.data || [])
    .map((m: any) => m.organizations)
    .filter(Boolean)

  return NextResponse.json({
    projects: projectsRes.data || [],
    ventures: venturesRes.data || [],
    organizations,
  })
}
