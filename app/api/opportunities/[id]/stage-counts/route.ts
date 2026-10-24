import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const NEW_STAGES         = ['applied', 'submitted', 'pending']
const REVIEWING_STAGES   = ['reviewing']
const SHORTLIST_STAGES   = ['screening']
const INTERVIEW_STAGES   = ['interviewing']
const OFFER_STAGES       = ['offered']
const SELECTED_STAGES    = ['hired']
const REJECTED_STAGES    = ['rejected']
const WITHDRAWN_STAGES   = ['withdrawn']
const QUALIFIED_STAGES   = ['reviewing', 'screening', 'interviewing', 'offered', 'hired']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, poster_user_id, view_count')
    .eq('id', id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Owner or manager
  let allowed = opp.poster_user_id === user.id
  if (!allowed) {
    const { data: m } = await supabase
      .from('opportunity_members')
      .select('role')
      .eq('opportunity_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    allowed = !!m && ['owner', 'admin', 'manager', 'reviewer'].includes(m.role)
  }
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: apps } = await supabase
    .from('opportunity_applications')
    .select('pipeline_stage')
    .eq('opportunity_id', id)
    .neq('pipeline_stage', 'draft')

  const list = apps || []
  const has = (arr: string[]) => list.filter(a => arr.includes(a.pipeline_stage)).length

  const applicants   = list.length
  const qualified    = has(QUALIFIED_STAGES)
  const shortlisted  = has(SHORTLIST_STAGES)
  const interviewing = has(INTERVIEW_STAGES)
  const offered      = has(OFFER_STAGES)
  const selected     = has(SELECTED_STAGES)
  const rejected     = has(REJECTED_STAGES)
  const withdrawn    = has(WITHDRAWN_STAGES)
  const awaiting     = has(NEW_STAGES)
  const reviewing    = has(REVIEWING_STAGES)

  const views = opp.view_count || 0
  const conversion = views > 0 ? Math.round((applicants / views) * 1000) / 10 : 0

  return NextResponse.json({
    applicants,
    awaiting,
    reviewing,
    qualified,
    shortlisted,
    interviewing,
    offered,
    selected,
    rejected,
    withdrawn,
    conversion,
  })
}