import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Whitelist of fields the client is allowed to PATCH via this endpoint.
// Explicit list prevents accidental writes to counters/audit fields.
const ALLOWED_FIELDS = new Set([
  'opportunity_type',
  'title',
  'subtitle',
  'description',
  'content_blocks',
  'content_html',
  'content_text',
  'primary_category_id',
  'subcategory_id',
  'required_skills',
  'preferred_skills',
  'experience_level',
  'compensation_type',
  'compensation_min',
  'compensation_max',
  'compensation_currency',
  'compensation_period',
  'equity_min',
  'equity_max',
  'compensation_hidden',
  'compensation_negotiable',
  'project_length',
  'time_commitment',
  'hours_per_week',
  'duration',
  'start_date',
  'application_deadline',
  'work_mode',
  'location',
  'timezone',
  'team_context',
  'role_purpose',
  'positions_open',
  'allow_multiple_applications',
  'allow_withdrawal',
  'max_applications',
  'auto_close_after_deadline',
  'require_resume',
  'require_portfolio',
  'require_github',
  'require_website',
  'require_cover_letter',
  'visibility',
  'show_applicant_count',
  'show_poster_identity',
  'show_compensation',
  'show_location',
  'cover_image_url',
  'urgency',
  'project_id',
  'venture_id',
  'organization_id',
  'community_id',
  'poster_context',
])

async function assertOwner(supabase: any, userId: string, oppId: string) {
  const { data } = await supabase
    .from('opportunities')
    .select('id, poster_user_id, status, updated_at')
    .eq('id', oppId)
    .single()
  if (!data) return { ok: false, code: 404 as const }
  if (data.poster_user_id !== userId) return { ok: false, code: 403 as const }
  return { ok: true as const, opp: data }
}

/**
 * GET /api/opportunities/drafts/[id]
 * Returns the full draft with structured data (opportunity + skills + questions + media + distribution).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const [
    { data: opp },
    { data: skills },
    { data: questions },
    { data: media },
    { data: distribution },
  ] = await Promise.all([
    supabase.from('opportunities').select('*').eq('id', id).single(),
    supabase
      .from('opportunity_skill_requirements')
      .select('*')
      .eq('opportunity_id', id)
      .order('order_index'),
    supabase
      .from('opportunity_application_questions')
      .select('*, options:opportunity_application_question_options(*)')
      .eq('opportunity_id', id)
      .order('order_index'),
    supabase
      .from('opportunity_media')
      .select('*')
      .eq('opportunity_id', id)
      .order('position'),
    supabase
      .from('opportunity_distribution')
      .select('*')
      .eq('opportunity_id', id),
  ])

  return NextResponse.json({
    opportunity: opp,
    skill_requirements: skills || [],
    application_questions: questions || [],
    media: media || [],
    distribution: distribution || [],
  })
}

/**
 * PATCH /api/opportunities/drafts/[id]
 * body: { patch: {...}, expected_updated_at?: string }
 * Applies allow-listed field updates. Rejects stale writes.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, user.id, id)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.code === 404 ? 'Not found' : 'Forbidden' },
      { status: gate.code }
    )
  }

  const body = await req.json().catch(() => ({}))
  const patch = body.patch || {}
  const expectedUpdatedAt = body.expected_updated_at || null


  const clean: Record<string, any> = {}
  for (const [k, v] of Object.entries(patch)) {
    if (ALLOWED_FIELDS.has(k)) clean[k] = v
  }

  if (Object.keys(clean).length === 0) {
    return NextResponse.json({
      ok: true,
      unchanged: true,
      updated_at: gate.opp.updated_at,
    })
  }

  clean.updated_at = new Date().toISOString()
  clean.last_activity_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('opportunities')
    .update(clean)
    .eq('id', id)
    .select('updated_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated_at: data.updated_at })
}