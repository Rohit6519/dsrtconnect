import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: thread } = await supabase
    .from('inbox_threads')
    .select('participant_ids')
    .eq('id', threadId)
    .single()

  if (!thread || !thread.participant_ids.includes(user.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: attachments } = await supabase
    .from('inbox_attachments')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true })

  return NextResponse.json({ attachments: attachments || [] })
}
