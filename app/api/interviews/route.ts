import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InterviewService } from '@/lib/interviews/InterviewService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const application_id = sp.get('application_id')
  const opportunity_id = sp.get('opportunity_id')

  let q = supabase.from('interviews').select('*, interview_participants(*)')
  if (application_id) q = q.eq('application_id', application_id)
  if (opportunity_id) q = q.eq('opportunity_id', opportunity_id)
  q = q.order('scheduled_at', { ascending: false, nullsFirst: false })

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ interviews: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  try {
    const interview = await InterviewService.createInterview(body, user.id)
    return NextResponse.json({ interview })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 400 })
  }
}