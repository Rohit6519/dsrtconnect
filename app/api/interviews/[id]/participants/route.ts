import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { user_id, role = 'interviewer', is_required = true } = body
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { error } = await supabase.from('interview_participants').upsert({
    interview_id: id, user_id, role, is_required, invited_by: user.id,
  }, { onConflict: 'interview_id,user_id,role' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const sp = new URL(req.url).searchParams
  const user_id = sp.get('user_id')
  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { error } = await supabase.from('interview_participants').delete()
    .eq('interview_id', id).eq('user_id', user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}