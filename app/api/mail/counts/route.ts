import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ counts: {} })

  const { searchParams } = new URL(request.url)
  const identityId = searchParams.get('identity_id')

  try {
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', { p_user_id: user.id })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)
    if (ownedIds.length === 0) return NextResponse.json({ counts: {} })

    const targetIds = (!identityId || identityId === 'unified') 
      ? ownedIds 
      : (ownedIds.includes(identityId) ? [identityId] : [])
    
    if (targetIds.length === 0) return NextResponse.json({ counts: {} })

    const { data: parts, error } = await supabase
      .from('mail_thread_participants')
      .select(`
        thread_id, folder, is_read, is_starred, is_archived, is_trashed, is_snoozed, is_spam, is_important, role,
        mail_threads (source_type, action_state, has_attachments, last_message_sender_identity_id)
      `)
      .in('identity_id', targetIds)

    if (error) throw error

    const { count: draftsCount } = await supabase
      .from('mail_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('scheduled_send_at', null)

    const { count: schedCount } = await supabase
      .from('mail_drafts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .not('scheduled_send_at', 'is', null)

    const threadMap = new Map<string, any>()
    ;(parts || []).forEach(p => {
      const existing = threadMap.get(p.thread_id)
      if (!existing || (!p.is_read && existing.is_read)) threadMap.set(p.thread_id, p)
    })
    const all = Array.from(threadMap.values())

    const counts = {
      inbox: all.filter(p => p.folder === 'inbox' && !p.is_trashed && !p.is_archived && !p.is_spam && !p.is_snoozed && !p.is_read).length,
      starred: all.filter(p => p.is_starred && !p.is_trashed).length,
      snoozed: all.filter(p => p.is_snoozed && !p.is_trashed).length,
      sent: all.filter(p => p.role === 'from' && !p.is_trashed).length,
      drafts: draftsCount || 0,
      scheduled: schedCount || 0,
      all: all.filter(p => !p.is_trashed).length,
      quarantine: all.filter(p => p.folder === 'quarantine' && !p.is_trashed).length,
      spam: all.filter(p => p.is_spam && !p.is_trashed).length,
      trash: all.filter(p => p.is_trashed).length,
      
      important: all.filter(p => p.is_important && !p.is_trashed && !p.is_read).length,
      action_required: all.filter(p => 
        !p.is_trashed && 
        p.mail_threads && 
        ['connect', 'application', 'venture_invite', 'project_invite'].includes(p.mail_threads.source_type) &&
        p.mail_threads.action_state === null
      ).length,
      awaiting_reply: all.filter(p => 
        p.role === 'from' && 
        !p.is_trashed && 
        p.mail_threads && 
        targetIds.includes(p.mail_threads.last_message_sender_identity_id)
      ).length,
      unread: all.filter(p => !p.is_read && !p.is_trashed && !p.is_spam).length,
      with_attachments: all.filter(p => !p.is_trashed && p.mail_threads?.has_attachments).length,
      shared_with_me: all.filter(p => p.role !== 'from' && !p.is_trashed && !p.is_read).length,
    }

    return NextResponse.json({ counts })
  } catch (e: any) {
    console.error('Counts error:', e)
    return NextResponse.json({ counts: {} })
  }
}