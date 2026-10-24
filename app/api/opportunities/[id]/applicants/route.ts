import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/opportunities/[id]/applicants
 * Returns all applicants for an opportunity (owner only)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Check ownership of the opportunity
    const { data: opp } = await supabase
      .from('opportunities')
      .select('poster_user_id')
      .eq('id', id)
      .single()

    if (!opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    if (opp.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch all applications
    const { data: apps, error } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('opportunity_id', id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const items = apps || []
    const applicantIds = [...new Set(items.map(a => a.applicant_id).filter(Boolean))]

    // Enrich with user profile data
    const { data: users } = applicantIds.length
      ? await supabase
          .from('users')
          .select('id, username, full_name, avatar_url, tagline, is_verified, location')
          .in('id', applicantIds)
      : { data: [] }

    const userMap = new Map((users || []).map((u: any) => [u.id, u]))

    // Calculate stage stats
    const stats: Record<string, number> = { total: items.length }
    for (const a of items) {
      const stage = a.pipeline_stage || 'submitted'
      stats[stage] = (stats[stage] || 0) + 1
    }

    const enriched = items.map(a => ({
      ...a,
      applicant: userMap.get(a.applicant_id) || a.applicant_snapshot || null,
    }))

    return NextResponse.json({ applications: enriched, stats })
  } catch (e: any) {
    console.error('List applicants error:', e)
    return NextResponse.json({ error: e?.message, applications: [], stats: {} }, { status: 500 })
  }
}