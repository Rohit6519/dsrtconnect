import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/opportunities/dashboard/messages/read
 * body: { application_id: string }
 * Marks all messages for this application (where I'm the recipient) as read.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const application_id = String(body.application_id || '').trim()
  if (!application_id) {
    return NextResponse.json(
      { error: 'application_id required' },
      { status: 400 }
    )
  }

  try {
    const { error } = await supabase
      .from('inbox_messages')
      .update({ status: 'read' })
      .eq('recipient_id', user.id)
      .eq('status', 'unread')
      .filter(
        'metadata->>opportunity_application_id',
        'eq',
        application_id
      )

    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('mark read error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed' },
      { status: 500 }
    )
  }
}