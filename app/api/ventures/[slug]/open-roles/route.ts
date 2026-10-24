import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ventures/[slug]/open-roles
 * Returns canonical opportunities where venture_id matches this venture.
 * No duplicate role system — this reads directly from `opportunities`.
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const isMember = user && await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })

    // Fetch canonical opportunities linked to this venture
    let query = supabase
      .from('opportunities')
      .select(`
        id, slug, title, subtitle, opportunity_type, status,
        work_mode, location, compensation_type, compensation_min, compensation_max,
        compensation_currency, compensation_period, experience_level,
        time_commitment, positions_open, application_count, view_count,
        required_skills, preferred_skills, urgency,
        linked_position_id, published_at, created_at, updated_at,
        poster:users!poster_user_id(id, full_name, username, avatar_url)
      `)
      .eq('venture_id', venture.id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Non-members only see active/published opportunities
    if (!isMember) {
      query = query.in('status', ['active', 'closing-soon'])
    }

    const { data: roles, error } = await query

    if (error) throw error

    // Enrich with application stats for owners
    let applicationStats: Record<string, any> = {}
    if (isMember && roles && roles.length > 0) {
      const roleIds = roles.map(r => r.id)

      const { data: appCounts } = await supabase
        .from('opportunity_applications')
        .select('opportunity_id, pipeline_stage')
        .in('opportunity_id', roleIds)

      if (appCounts) {
        for (const app of appCounts) {
          if (!applicationStats[app.opportunity_id]) {
            applicationStats[app.opportunity_id] = { total: 0, new: 0, shortlisted: 0, interview: 0 }
          }
          applicationStats[app.opportunity_id].total++
          if (app.pipeline_stage === 'submitted') applicationStats[app.opportunity_id].new++
          if (app.pipeline_stage === 'shortlisted') applicationStats[app.opportunity_id].shortlisted++
          if (app.pipeline_stage === 'interview') applicationStats[app.opportunity_id].interview++
        }
      }
    }

    // Check if current user has applied to any of these
    let userApplications: Set<string> = new Set()
    if (user && roles && roles.length > 0) {
      const { data: userApps } = await supabase
        .from('opportunity_applications')
        .select('opportunity_id')
        .eq('applicant_id', user.id)
        .in('opportunity_id', roles.map(r => r.id))
        .neq('pipeline_stage', 'draft')

      userApplications = new Set((userApps || []).map((a: any) => a.opportunity_id))
    }

    const enriched = (roles || []).map(role => ({
      ...role,
      application_stats: applicationStats[role.id] || { total: 0, new: 0, shortlisted: 0, interview: 0 },
      has_applied: userApplications.has(role.id),
    }))

    return NextResponse.json({
      roles: enriched,
      can_manage: !!isMember,
    })
  } catch (e: any) {
    console.error('Open roles error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}