import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch app + verify manager access via opportunity ownership OR membership
  const { data: app } = await supabase
    .from('opportunity_applications')
    .select('*')
    .eq('id', appId)
    .single()
  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, slug, title, opportunity_type, status, required_skills, preferred_skills, poster_user_id, opportunity_number, custom_questions')
    .eq('id', app.opportunity_id)
    .single()

  if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let canAccess = opp.poster_user_id === user.id
  if (!canAccess) {
    const { data: m } = await supabase
      .from('opportunity_members')
      .select('role')
      .eq('opportunity_id', opp.id)
      .eq('user_id', user.id)
      .maybeSingle()
    canAccess = !!m && ['owner', 'admin', 'manager', 'reviewer'].includes((m as any).role)
  }
  if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Enrich applicant profile (live) — but keep snapshot around for historical answers
  const { data: applicant } = await supabase
    .from('users')
    .select('id, username, full_name, avatar_url, tagline, bio, location, is_verified, profile_tags, availability, follower_count')
    .eq('id', app.applicant_id)
    .maybeSingle()

  const [{ data: reviewers }, { data: notes }, { data: history }] = await Promise.all([
    supabase
      .from('opportunity_application_reviewers')
      .select('reviewer_id, assigned_at')
      .eq('application_id', appId),
    supabase
      .from('opportunity_internal_notes')
      .select('id, author_id, body, mentions, created_at')
      .eq('application_id', appId)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('opportunity_application_history')
      .select('from_stage, to_stage, changed_by, created_at')
      .eq('application_id', appId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const reviewerIds = [...new Set([
    ...(reviewers || []).map((r: any) => r.reviewer_id),
    ...(notes || []).map((n: any) => n.author_id),
  ])]

  const { data: reviewerProfiles } = reviewerIds.length
    ? await supabase.from('users').select('id, username, full_name, avatar_url').in('id', reviewerIds)
    : { data: [] as any[] }

  const profMap = new Map((reviewerProfiles || []).map((u: any) => [u.id, u]))

  return NextResponse.json({
    application: app,
    applicant: applicant || app.applicant_snapshot || null,
    opportunity: opp,
    reviewers: (reviewers || []).map((r: any) => ({
      ...r,
      profile: profMap.get(r.reviewer_id) || null,
    })),
    notes: (notes || []).map((n: any) => ({
      ...n,
      author: profMap.get(n.author_id) || null,
    })),
    history: history || [],
  })
}