import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackOpportunityEvent } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: opp, error: oppErr } = await supabase
      .from('opportunities')
      .select(
        'id, poster_user_id, status, applications_open, application_deadline, max_applications, application_count'
      )
      .eq('id', id)
      .single()

    if (oppErr || !opp) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (opp.poster_user_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot apply to your own opportunity' },
        { status: 400 }
      )
    }
    if (!opp.applications_open || !['active', 'closing-soon'].includes(opp.status)) {
      return NextResponse.json({ error: 'Applications are closed' }, { status: 400 })
    }
    if (opp.application_deadline && new Date(opp.application_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'The application deadline has passed' },
        { status: 400 }
      )
    }
    if (opp.max_applications && (opp.application_count ?? 0) >= opp.max_applications) {
      return NextResponse.json(
        { error: 'Maximum applications reached' },
        { status: 400 }
      )
    }

    // 1. Check existing
    const { data: existing } = await supabase
      .from('opportunity_applications')
      .select('id, pipeline_stage')
      .eq('opportunity_id', id)
      .eq('applicant_id', user.id)
      .maybeSingle()

    if (existing) {
      // Already submitted / in review / accepted / rejected → hard block
      if (existing.pipeline_stage !== 'draft' && existing.pipeline_stage !== 'withdrawn') {
        return NextResponse.json(
          {
            error: 'Already applied',
            application_id: existing.id,
            status: existing.pipeline_stage,
          },
          { status: 409 }
        )
      }

      // Draft → resume same draft
      if (existing.pipeline_stage === 'draft') {
        return NextResponse.json({ application_id: existing.id })
      }

      // Withdrawn → reopen the SAME row as a fresh draft (fixes unique-constraint conflict)
      const { data: reopened, error: reopenErr } = await supabase
        .from('opportunity_applications')
        .update({
          pipeline_stage: 'draft',
          status: 'draft',
          stage_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('applicant_id', user.id)
        .select('id')
        .single()

      if (reopenErr) throw reopenErr

      return NextResponse.json({ application_id: reopened.id })
    }

    // 2. Snapshot profile
    const { data: profile } = await supabase
      .from('users')
      .select(
        'full_name, username, avatar_url, tagline, bio, location, is_verified, profile_tags, linkedin_url, github_url, website'
      )
      .eq('id', user.id)
      .single()

    const snapshot = {
      ...(profile || {}),
      snapshot_at: new Date().toISOString(),
    }

    // 3. Create draft
    const { data: draft, error: insertErr } = await supabase
      .from('opportunity_applications')
      .insert({
        opportunity_id: id,
        applicant_id: user.id,
        pipeline_stage: 'draft',
        status: 'draft',
        applicant_snapshot: snapshot,
        github_url: profile?.github_url || null,
        linkedin_url: profile?.linkedin_url || null,
        website_url: profile?.website || null,
        highlighted_skills: profile?.profile_tags || [],
      })
      .select('id')
      .single()

    if (insertErr) throw insertErr

    trackOpportunityEvent({
      opportunity_id: id,
      user_id: user.id,
      event_type: 'application_started',
      source: 'application_studio',
      metadata: { application_id: draft.id },
    }).catch(() => {})

    return NextResponse.json({ application_id: draft.id })
  } catch (e: any) {
    console.error('[apply init] error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed to start application' },
      { status: 500 }
    )
  }
}