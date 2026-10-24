import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/[id]/applications
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const source_type = searchParams.get('source') || 'team_up'
  const stage = searchParams.get('stage')

  let ownerCheck = false
  if (source_type === 'team_up') {
    const { data } = await supabase.from('team_up_requests').select('user_id').eq('id', id).single()
    ownerCheck = data?.user_id === user.id
  } else if (source_type === 'venture_lf') {
    const { data } = await supabase.from('venture_looking_for').select('venture_id').eq('id', id).single()
    if (data) {
      const { data: v } = await supabase.from('ventures').select('user_id').eq('id', data.venture_id).single()
      ownerCheck = v?.user_id === user.id
    }
  } else if (source_type === 'project_role') {
    const { data } = await supabase.from('project_roles').select('project_id').eq('id', id).single()
    if (data) {
      const { data: p } = await supabase.from('projects').select('founder_id, user_id').eq('id', data.project_id).single()
      ownerCheck = p?.founder_id === user.id || p?.user_id === user.id
    }
  }

  if (!ownerCheck) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const filter: any = {}
  if (source_type === 'team_up') filter.request_id = id
  else if (source_type === 'venture_lf') filter.venture_lf_id = id
  else if (source_type === 'project_role') filter.project_role_id = id

  let query = supabase.from('looking_for_applications').select('*').match(filter)
  if (stage) query = query.eq('pipeline_stage', stage)
  query = query.order('created_at', { ascending: false })

  const { data: apps, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const applicantIds = [...new Set((apps || []).map(a => a.applicant_id).filter(Boolean))]
  const [usersRes, scoresRes, skillsRes] = await Promise.all([
    applicantIds.length ? supabase.from('users')
      .select('id, username, full_name, avatar_url, tagline, bio, location, is_verified, execution_score')
      .in('id', applicantIds) : { data: [] },
    applicantIds.length ? supabase.from('team_up_score_components')
      .select('user_id, total_score, skill_match_score, industry_match_score')
      .eq('source_type', source_type).eq('source_id', id).in('user_id', applicantIds) : { data: [] },
    applicantIds.length ? supabase.from('user_skills')
      .select('user_id, skill_id, skills(name)').in('user_id', applicantIds) : { data: [] },
  ])

  const userMap = new Map((usersRes.data || []).map(u => [u.id, u]))
  const scoreMap = new Map((scoresRes.data || []).map(s => [s.user_id, s]))
  const skillsMap = new Map<string, string[]>()
  ;(skillsRes.data || []).forEach((s: any) => {
    const arr = skillsMap.get(s.user_id) || []
    if (s.skills?.name) arr.push(s.skills.name)
    skillsMap.set(s.user_id, arr)
  })

  const enriched = (apps || []).map(a => ({
    ...a,
    applicant: userMap.get(a.applicant_id),
    score: scoreMap.get(a.applicant_id),
    skills: skillsMap.get(a.applicant_id) || [],
  })).sort((a, b) => (b.score?.total_score || 0) - (a.score?.total_score || 0))

  return NextResponse.json({ applications: enriched, total: enriched.length })
}
