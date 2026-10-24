import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized', related: [] }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entity_type')
  const entityId = searchParams.get('entity_id')
  const excludeThreadId = searchParams.get('exclude_thread_id')

  if (!entityType || !entityId) return NextResponse.json({ related: [] })

  try {
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)

    // Find threads related to this entity
    let query = supabase
      .from('mail_threads')
      .select('id, subject, last_message_at, last_message_preview, last_message_sender_identity_id, source_type, action_state')
      .eq('source_entity_type', entityType)
      .eq('source_entity_id', entityId)
      .order('last_message_at', { ascending: false })
      .limit(10)

    if (excludeThreadId) query = query.neq('id', excludeThreadId)

    const { data: threads } = await query

    // Filter to threads the user has access to
    const threadIds = (threads || []).map(t => t.id)
    if (threadIds.length === 0) return NextResponse.json({ related: [] })

    const { data: accessibleParticipations } = await supabase
      .from('mail_thread_participants')
      .select('thread_id')
      .in('thread_id', threadIds)
      .in('identity_id', ownedIds)

    const accessibleThreadIds = new Set((accessibleParticipations || []).map(p => p.thread_id))
    const accessibleThreads = (threads || []).filter(t => accessibleThreadIds.has(t.id))

    // Enrich with sender info
    const senderIds = Array.from(new Set(accessibleThreads.map(t => t.last_message_sender_identity_id).filter(Boolean)))
    let identityMap: Record<string, any> = {}
    if (senderIds.length > 0) {
      const { data: idents } = await supabase
        .from('mail_identities')
        .select('id, display_name, avatar_url')
        .in('id', senderIds)
      identityMap = Object.fromEntries((idents || []).map(i => [i.id, i]))
    }

    const enriched = accessibleThreads.map(t => ({
      ...t,
      last_sender: identityMap[t.last_message_sender_identity_id] || null,
    }))

    return NextResponse.json({ related: enriched })
  } catch (e: any) {
    console.error('Context error:', e)
    return NextResponse.json({ error: e?.message, related: [] }, { status: 500 })
  }
}