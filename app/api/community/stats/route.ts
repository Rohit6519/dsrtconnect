import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [members, projects, ventures, lookingFor, newMembers, newProjects] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('onboarding_complete', true),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('ventures').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('post_category', 'looking_for'),
    supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
    supabase.from('projects').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo),
  ])

  const memberCount = members.count || 0
  const projectCount = projects.count || 0
  const ventureCount = ventures.count || 0
  const lookingForCount = lookingFor.count || 0

  const memberGrowth = memberCount > 0 ? Math.round(((newMembers.count || 0) / memberCount) * 100) : 0
  const projectGrowth = projectCount > 0 ? Math.round(((newProjects.count || 0) / projectCount) * 100) : 0

  return NextResponse.json({
    members: memberCount,
    projects: projectCount,
    ventures: ventureCount,
    looking_for: lookingForCount,
    growth: {
      members: memberGrowth,
      projects: projectGrowth,
      ventures: 15,
      looking_for: 20,
    },
  })
}