import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { cancelSnooze } from '@/lib/mail/security/SnoozeEngine'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: snoozeOrThreadId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await cancelSnooze(snoozeOrThreadId, user.id)
    return NextResponse.json({ success: true, cancelled: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to cancel snooze' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context)
}