import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'team_up'

  const { data: opp } = await supabase.from('team_up_unified')
    .select('owner_id').eq('source_type', source).eq('source_id', id).maybeSingle()

  if (!opp?.owner_id) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [userRes, skillsRes, projectsRes, venturesRes] = await Promise.all([
    supabase.from('users')
      .select('id, username, full_name, avatar_url, tagline, bio, location, is_verified, execution_score, follower_count, brings')
      .eq('id', opp.owner_id).single(),
    supabase.from('user_skills')
      .select('skills(id, name)').eq('user_id', opp.owner_id),
    supabase.from('projects')
      .select('id, slug, name, logo_url, icon, tagline')
      .or(`founder_id.eq.${opp.owner_id},user_id.eq.${opp.owner_id}`)
      .eq('is_public', true)
      .order('last_activity_at', { ascending: false })
      .limit(8),
    supabase.from('ventures')
      .select('id, slug, name, logo_url, tagline')
      .eq('user_id', opp.owner_id)
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const skills = (skillsRes.data || []).map((s: any) => s.skills).filter(Boolean)

  return NextResponse.json({
    poster: userRes.data,
    skills,
    projects: projectsRes.data || [],
    ventures: venturesRes.data || [],
  })
}
