import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InterviewService } from '@/lib/interviews/InterviewService'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: iv, error } = await supabase
    .from('interviews')
    .select('*, interview_participants(*), interview_feedback(*)')
    .eq('id', id)
    .single()
  if (error || !iv) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Enrich participants with user profiles
  const uids = (iv.interview_participants || []).map((p: any) => p.user_id)
  const { data: users } = uids.length
    ? await supabase.from('users').select('id, username, full_name, avatar_url').in('id', uids)
    : { data: [] }
  const uMap = new Map((users || []).map((u: any) => [u.id, u]))
  const participants = (iv.interview_participants || []).map((p: any) => ({ ...p, profile: uMap.get(p.user_id) || null }))

  return NextResponse.json({ interview: { ...iv, participants } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body.action === 'cancel') {
    const r = await InterviewService.cancelInterview(id, user.id, body.reason)
    return NextResponse.json({ interview: r })
  }
  if (body.action === 'reschedule' && body.scheduled_at) {
    const r = await InterviewService.rescheduleInterview(id, body.scheduled_at, user.id)
    return NextResponse.json(r)
  }
  if (body.action === 'complete') {
    const { data } = await supabase.from('interviews').update({ status: 'completed' }).eq('id', id).select().single()
    return NextResponse.json({ interview: data })
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}