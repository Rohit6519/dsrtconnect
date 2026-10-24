import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function generateSlug(name: string): string {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'venture'
  const suffix = Math.random().toString(36).substring(2, 8)
  return base + '-' + suffix
}

/**
 * POST /api/ventures/drafts
 * Body: { name, tagline?, industry?, mode?: 'basic' | 'assessment' }
 * Headers: X-Idempotency-Key (optional but recommended)
 *
 * Creates a draft venture + assessment record.
 * If mode='assessment', assessment_status='in_progress'.
 * If mode='basic', assessment_status='not_started'.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const idempotencyKey = request.headers.get('x-idempotency-key')

  // Check idempotency
  if (idempotencyKey) {
    const { data: existing } = await supabase
      .from('venture_idempotency_keys')
      .select('response')
      .eq('key', idempotencyKey)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existing) return NextResponse.json(existing.response)
  }

  try {
    const body = await request.json().catch(() => ({}))
    const name = String(body.name || '').trim().slice(0, 120)
    if (name.length < 2) {
      return NextResponse.json({ error: 'Name is required (min 2 chars)' }, { status: 400 })
    }

    const mode = body.mode === 'basic' ? 'basic' : 'assessment'
    const slug = generateSlug(name)

    // Create venture
    const ventureInsert: Record<string, any> = {
      user_id: user.id,
      founder_id: user.id,
      name,
      slug,
      status: 'active',
      stage: 'idea',
      is_draft: true,
      is_current: true,
      is_building_public: true,
      show_in_explore: false, // Hidden until assessment or explicit publish
      assessment_status: mode === 'assessment' ? 'in_progress' : 'not_started',
      assessment_current_step: 1,
      assessment_schema_version: 1,
      last_activity_at: new Date().toISOString(),
    }
    if (body.tagline) ventureInsert.tagline = String(body.tagline).slice(0, 200)
    if (body.industry) ventureInsert.industry = String(body.industry).slice(0, 100)
    if (body.sector) ventureInsert.sector = String(body.sector).slice(0, 100)

    const { data: venture, error: ventureError } = await supabase
      .from('ventures')
      .insert(ventureInsert)
      .select()
      .single()

    if (ventureError) throw ventureError

    // Create assessment record only if in assessment mode
    if (mode === 'assessment') {
      const { error: assessmentError } = await supabase
        .from('venture_assessments')
        .insert({
          venture_id: venture.id,
          owner_id: user.id,
          status: 'in_progress',
          current_step: 1,
          schema_version: 1,
        })
      if (assessmentError) throw assessmentError
    }

    // Add founder as team member (silent-fail)
    await supabase.from('venture_team_members').insert({
      venture_id: venture.id,
      user_id: user.id,
      name: user.email?.split('@')[0] || 'Founder',
      role: 'Founder',
      is_founder: true,
      status: 'active',
      can_publish: true,
      can_view_notifications: true,
    }).then(() => {}, () => {})

    // Log event
    await supabase.from('venture_events').insert({
      venture_id: venture.id,
      event_type: 'venture.draft_created',
      actor_id: user.id,
      payload: { mode, slug },
    }).then(() => {}, () => {})

    const response = {
      success: true,
      venture: {
        id: venture.id,
        slug: venture.slug,
        name: venture.name,
        assessment_status: venture.assessment_status,
        current_step: venture.assessment_current_step,
      },
      next_url: mode === 'assessment'
        ? `/ventures/${venture.slug}/assessment/1`
        : `/ventures/${venture.slug}`,
    }

    // Store idempotency
    if (idempotencyKey) {
      await supabase.from('venture_idempotency_keys').insert({
        key: idempotencyKey,
        user_id: user.id,
        venture_id: venture.id,
        action: 'create_draft',
        response,
      }).then(() => {}, () => {})
    }

    return NextResponse.json(response)
  } catch (e: any) {
    console.error('Create draft error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to create draft' }, { status: 500 })
  }
}