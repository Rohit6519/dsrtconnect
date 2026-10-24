import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const { reason } = body

  // Schedule deletion for 30 days from now
  const scheduledFor = new Date()
  scheduledFor.setDate(scheduledFor.getDate() + 30)

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .insert({
      user_id: user.id,
      reason: reason || null,
      scheduled_for: scheduledFor.toISOString(),
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Deletion already scheduled' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'schedule_account_deletion',
    p_severity: 'critical',
    p_metadata: { scheduled_for: scheduledFor.toISOString() },
  })

  return NextResponse.json({ request: data })
}

export async function DELETE() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('account_deletion_requests')
    .update({ cancelled_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('cancelled_at', null)
    .is('completed_at', null)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.rpc('log_audit', {
    p_user_id: user.id,
    p_action: 'cancel_account_deletion',
    p_severity: 'info',
  })

  return NextResponse.json({ success: true })
}