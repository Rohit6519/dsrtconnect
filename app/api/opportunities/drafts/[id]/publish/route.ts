import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  trackOpportunityEvent,
  writeOpportunityAudit,
} from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [{ data: opp }, { data: skills }] = await Promise.all([
      supabase.from('opportunities').select('*').eq('id', id).single(),
      supabase
        .from('opportunity_skill_requirements')
        .select('id')
        .eq('opportunity_id', id),
    ])

    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (opp.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const errors: { field: string; message: string; step: string }[] = []

    if (!opp.title || opp.title === 'Untitled opportunity') {
      errors.push({
        field: 'title',
        message: 'Give your opportunity a clear title.',
        step: 'basics',
      })
    }
    if (!opp.opportunity_type) {
      errors.push({
        field: 'opportunity_type',
        message: 'Select an opportunity type.',
        step: 'basics',
      })
    }
    if (!opp.description && !opp.content_text) {
      errors.push({
        field: 'description',
        message: 'Add a description of the opportunity.',
        step: 'details',
      })
    }
    if (!opp.work_mode) {
      errors.push({
        field: 'work_mode',
        message: 'Select a work mode (remote, hybrid, on-site).',
        step: 'requirements',
      })
    }
    if (!opp.compensation_type) {
      errors.push({
        field: 'compensation_type',
        message: 'Set a compensation type.',
        step: 'requirements',
      })
    }
    if ((skills || []).length === 0) {
      errors.push({
        field: 'skills',
        message: 'Add at least one required skill.',
        step: 'requirements',
      })
    }
    if (opp.poster_context === 'project' && !opp.project_id) {
      errors.push({
        field: 'project_id',
        message: 'Select a project for this opportunity.',
        step: 'basics',
      })
    }
    if (opp.poster_context === 'venture' && !opp.venture_id) {
      errors.push({
        field: 'venture_id',
        message: 'Select a venture for this opportunity.',
        step: 'basics',
      })
    }

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 400 })
    }

    let slug = opp.slug
    if (!slug) {
      const base = String(opp.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 60)
      slug = `${base}-${Math.random().toString(36).substring(2, 6)}`
    }

    const { data: published, error: publishError } = await supabase
      .from('opportunities')
      .update({
        status: 'active',
        slug,
        published_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, slug, opportunity_number')
      .single()

    if (publishError) throw publishError

    const CORE_SURFACES = ['looking_for', 'search', 'recommendations'] as const
    for (const type of CORE_SURFACES) {
      try {
        const { data: existing } = await supabase
          .from('opportunity_distribution')
          .select('id')
          .eq('opportunity_id', id)
          .eq('destination_type', type)
          .is('destination_id', null)
          .maybeSingle()

        if (!existing) {
          const { error: distErr } = await supabase
            .from('opportunity_distribution')
            .insert({
              opportunity_id: id,
              destination_type: type,
              status: 'active',
              created_by: user.id,
              published_at: new Date().toISOString(),
            })
          if (distErr) console.error('distribution insert failed:', distErr)
        }
      } catch (e) {
        console.error('distribution setup failed:', e)
      }
    }

    await writeOpportunityAudit({
      opportunity_id: id,
      actor_id: user.id,
      action: 'opportunity_published',
      target_type: 'opportunity',
      target_id: id,
      after_state: { status: 'active', slug },
    }).catch(() => {})

    await trackOpportunityEvent({
      opportunity_id: id,
      user_id: user.id,
      event_type: 'opportunity_published',
      source: 'studio_publish',
    }).catch(() => {})

    return NextResponse.json({
      ok: true,
      opportunity_id: published.id,
      slug: published.slug,
      opportunity_number: published.opportunity_number,
    })
  } catch (e: any) {
    console.error('Publish error:', e)
    return NextResponse.json(
      { error: e?.message || 'Publish failed' },
      { status: 500 }
    )
  }
}