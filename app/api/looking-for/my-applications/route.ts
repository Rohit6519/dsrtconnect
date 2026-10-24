import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/my-applications
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const stage = searchParams.get('stage')

  let query = supabase.from('looking_for_applications').select('*').eq('applicant_id', user.id)
  if (stage) query = query.eq('pipeline_stage', stage)
  const { data: apps, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = await Promise.all((apps || []).map(async (a) => {
    let opportunity: any = null
    let context: any = null

    if (a.request_id) {
      const { data } = await supabase.from('team_up_requests')
        .select('id, title, tagline, request_type, user_id, venture_id, project_id, status, application_deadline')
        .eq('id', a.request_id).single()
      opportunity = data
    } else if (a.venture_lf_id) {
      const { data } = await supabase.from('venture_looking_for')
        .select('id, title, type, venture_id, status, closes_at').eq('id', a.venture_lf_id).single()
      opportunity = data
      if (data?.venture_id) {
        const { data: v } = await supabase.from('ventures').select('id, slug, name, logo_url').eq('id', data.venture_id).single()
        context = { type: 'venture', ...v }
      }
    } else if (a.project_role_id) {
      const { data } = await supabase.from('project_roles')
        .select('id, role, description, project_id, status, closes_at').eq('id', a.project_role_id).single()
      opportunity = data
      if (data?.project_id) {
        const { data: p } = await supabase.from('projects').select('id, slug, name, logo_url, icon').eq('id', data.project_id).single()
        context = { type: 'project', ...p }
      }
    }

    return { ...a, opportunity, context }
  }))

  const stats = {
    total: enriched.length,
    applied: enriched.filter(a => a.pipeline_stage === 'applied').length,
    under_review: enriched.filter(a => a.pipeline_stage === 'under_review').length,
    shortlisted: enriched.filter(a => a.pipeline_stage === 'shortlisted').length,
    interview: enriched.filter(a => a.pipeline_stage === 'interview').length,
    accepted: enriched.filter(a => a.pipeline_stage === 'accepted').length,
    rejected: enriched.filter(a => a.pipeline_stage === 'rejected').length,
    withdrawn: enriched.filter(a => a.pipeline_stage === 'withdrawn').length,
  }

  return NextResponse.json({ applications: enriched, stats })
}
