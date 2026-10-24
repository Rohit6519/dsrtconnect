import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/opportunities/[id]/applicants/bulk
 * Body: { application_ids: string[], patch: { pipeline_stage?, is_starred?, ... } }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: opp } = await supabase.from('opportunities')
      .select('poster_user_id').eq('id', id).single()
    if (!opp || opp.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { application_ids, patch } = body

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'application_ids required' }, { status: 400 })
    }

    const updates: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }

    if (patch.pipeline_stage) {
      const valid = ['submitted', 'viewed', 'under-review', 'shortlisted', 'interview', 'offer', 'accepted', 'declined', 'withdrawn']
      if (!valid.includes(patch.pipeline_stage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      }
      updates.pipeline_stage = patch.pipeline_stage
      if (patch.pipeline_stage === 'accepted') updates.status = 'accepted'
      else if (patch.pipeline_stage === 'declined') updates.status = 'declined'
      else if (patch.pipeline_stage === 'withdrawn') updates.status = 'withdrawn'
      else updates.status = 'pending'
    }

    if ('is_starred' in patch) updates.is_starred = patch.is_starred

    const { data, error } = await supabase.from('opportunity_applications')
      .update(updates)
      .in('id', application_ids)
      .eq('opportunity_id', id)
      .select()

    if (error) throw error

    return NextResponse.json({ applications: data, updated: data?.length || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}