import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ counts: {} })

  try {
    const { data: identities } = await supabase.rpc('fn_get_user_mail_identities', { p_user_id: user.id })
    const ownedIds = (identities || []).map((i: any) => i.identity_id)
    if (ownedIds.length === 0) return NextResponse.json({ counts: {} })

    const { data: participations } = await supabase
      .from('mail_thread_participants')
      .select('thread_id, is_read')
      .in('identity_id', ownedIds)
      .eq('folder', 'inbox')
      .eq('is_trashed', false)
      .eq('is_spam', false)
      .eq('is_read', false)

    const threadIds = Array.from(new Set((participations || []).map(p => p.thread_id)))
    if (threadIds.length === 0) return NextResponse.json({ counts: { personal: 0, projects: 0, ventures: 0, network: 0 } })

    const { data: threads } = await supabase
      .from('mail_threads')
      .select('id, source_type, source_entity_type')
      .in('id', threadIds)

    const counts = { personal: 0, projects: 0, ventures: 0, network: 0 }
    ;(threads || []).forEach(t => {
      if (t.source_entity_type === 'project' || t.source_type === 'project_invite') counts.projects++
      else if (t.source_entity_type === 'venture' || t.source_type === 'venture_invite') counts.ventures++
      else if (t.source_type === 'connect' || t.source_type === 'application') counts.network++
      else counts.personal++
    })

    return NextResponse.json({ counts })
  } catch {
    return NextResponse.json({ counts: {} })
  }
}