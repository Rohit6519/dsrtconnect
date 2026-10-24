import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/** Candidate or interviewer confirms / declines / proposes new times */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { response, propose_slots } = body // response: accepted | declined | tentative

  if (response) {
    await supabase.from('interview_participants').update({
      response, response_at: new Date().toISOString(),
    }).eq('interview_id', id).eq('user_id', user.id)
  }

  if (Array.isArray(propose_slots) && propose_slots.length > 0) {
    const { data: iv } = await supabase.from('interviews')
      .select('application_id, opportunity_id').eq('id', id).single()
    if (iv) {
      const rows = propose_slots.map((s: any) => ({
        application_id: iv.application_id,
        opportunity_id: iv.opportunity_id,
        interview_id: id,
        proposed_by: user.id,
        proposer_role: 'candidate',
        start_at: s.start_at,
        end_at: s.end_at,
        timezone: s.timezone || 'UTC',
      }))
      await supabase.from('interview_availability_slots').insert(rows)
    }
  }

  return NextResponse.json({ ok: true })
}