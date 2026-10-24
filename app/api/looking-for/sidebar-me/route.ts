import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [userRes, skillsRes, projectsRes, venturesRes] = await Promise.all([
    supabase.from('users')
      .select('id, username, full_name, avatar_url, tagline, execution_score')
      .eq('id', user.id).single(),
    supabase.from('user_skills')
      .select('skill_id, skills(id, name)')
      .eq('user_id', user.id),
    supabase.from('projects')
      .select('id, slug, name, logo_url, icon')
      .or(`founder_id.eq.${user.id},user_id.eq.${user.id}`)
      .order('last_activity_at', { ascending: false })
      .limit(10),
    supabase.from('ventures')
      .select('id, slug, name, logo_url, tagline')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const skills = (skillsRes.data || [])
    .map((s: any) => s.skills)
    .filter(Boolean)

  return NextResponse.json({
    user: userRes.data,
    skills,
    projects: projectsRes.data || [],
    ventures: venturesRes.data || [],
  })
}
