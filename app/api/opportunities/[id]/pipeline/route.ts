import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: opp } = await supabase.from('opportunities').select('poster_user_id').eq('id', id).single()
  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let ok = opp.poster_user_id === user.id
  if (!ok) {
    const { data: m } = await supabase
      .from('opportunity_members').select('role').eq('opportunity_id', id).eq('user_id', user.id).maybeSingle()
    ok = !!m && ['owner', 'admin', 'manager', 'reviewer'].includes((m as any).role)
  }
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: stages }, { data: apps }] = await Promise.all([
    supabase
      .from('opportunity_pipeline_stages')
      .select('*')
      .eq('opportunity_id', id)
      .order('order_index', { ascending: true }),
    supabase
      .from('opportunity_applications')
      .select('id, applicant_id, applicant_snapshot, pipeline_stage, status, created_at, stage_updated_at, is_starred, internal_rating')
      .eq('opportunity_id', id)
      .neq('pipeline_stage', 'withdrawn')
      .order('stage_updated_at', { ascending: false, nullsFirst: false }),
  ])

  const applicantIds = [...new Set((apps || []).map((a: any) => a.applicant_id).filter(Boolean))]
  const { data: users } = applicantIds.length
    ? await supabase.from('users').select('id, username, full_name, avatar_url, is_verified').in('id', applicantIds)
    : { data: [] as any[] }
  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  const enriched = (apps || []).map((a: any) => ({
    ...a,
    applicant: userMap.get(a.applicant_id) || a.applicant_snapshot || null,
  }))

  return NextResponse.json({
    stages: stages || [],
    applications: enriched,
  })
}