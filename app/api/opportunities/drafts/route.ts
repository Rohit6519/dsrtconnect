import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

/**
 * POST /api/opportunities/drafts
 * Creates a fresh empty draft owned by the current user and returns its id.
 */
export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Generate an OPP-XXXXXX number
    const oppNumber = 'OPP-' + Math.random().toString(36).slice(2, 8).toUpperCase()

    const { data, error } = await supabase
      .from('opportunities')
      .insert({
        poster_user_id: user.id,
        poster_context: 'personal',
        opportunity_type: 'hire',
        title: 'Untitled opportunity',
        status: 'draft',
        visibility: 'public',
        applications_open: true,
        positions_open: 1,
        opportunity_number: oppNumber,
      })
      .select('id, opportunity_number')
      .single()

    if (error) throw error

    await writeOpportunityAudit({
      opportunity_id: data.id,
      actor_id: user.id,
      action: 'opportunity_created',
      target_type: 'opportunity',
      target_id: data.id,
    }).catch(() => {})

    return NextResponse.json({
      draft_id: data.id,
      opportunity_number: data.opportunity_number,
    })
  } catch (e: any) {
    console.error('Create draft error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}