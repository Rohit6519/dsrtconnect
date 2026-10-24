import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const nowIso = new Date().toISOString()

  await supabase.from('application_candidate_reads').upsert({
    application_id: appId,
    candidate_id: user.id,
    last_seen_at: nowIso,
    updated_at: nowIso,
  })

  // Also mark all owner→candidate messages read
  await supabase
    .from('inbox_messages')
    .update({ status: 'read' })
    .eq('reference_type', 'opportunity_application')
    .eq('reference_id', appId)
    .eq('recipient_id', user.id)
    .eq('status', 'unread')

  return NextResponse.json({ ok: true })
}