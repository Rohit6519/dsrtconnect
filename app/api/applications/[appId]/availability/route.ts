import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('interview_availability_slots')
    .select('*')
    .eq('application_id', appId)
    .order('start_at', { ascending: true })
  return NextResponse.json({ slots: data || [] })
}

/** Candidate submits their availability windows */
export async function POST(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const slots = Array.isArray(body.slots) ? body.slots : []
  if (slots.length === 0) return NextResponse.json({ error: 'slots required' }, { status: 400 })

  const { data: app } = await supabase.from('opportunity_applications')
    .select('id, opportunity_id, applicant_id').eq('id', appId).single()
  if (!app || app.applicant_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const rows = slots.map((s: any) => ({
    application_id: app.id,
    opportunity_id: app.opportunity_id,
    proposed_by: user.id,
    proposer_role: 'candidate',
    start_at: s.start_at,
    end_at: s.end_at,
    timezone: s.timezone || 'UTC',
  }))
  const { error } = await supabase.from('interview_availability_slots').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, inserted: rows.length })
}