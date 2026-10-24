import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', identities: [] }, 
      { status: 401 }
    )
  }

  try {
    // Call the RPC that auto-provisions and returns all identities
    const { data, error } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })

    if (error) {
      console.error('Identity RPC error:', error)
      throw error
    }

    // Sort: personal first → ventures → projects
    const sortOrder: Record<string, number> = { user: 0, venture: 1, project: 2 }
    const sorted = (data || []).sort((a: any, b: any) => {
      const orderDiff = sortOrder[a.entity_type] - sortOrder[b.entity_type]
      if (orderDiff !== 0) return orderDiff
      return (a.display_name || '').localeCompare(b.display_name || '')
    })

    // Compute quick stats per identity (unread counts)
    let unreadByIdentity: Record<string, number> = {}
    if (sorted.length > 0) {
      const { data: unreadData } = await supabase
        .from('mail_thread_participants')
        .select('identity_id')
        .in('identity_id', sorted.map((i: any) => i.identity_id))
        .eq('is_read', false)
        .eq('is_trashed', false)
        .eq('is_archived', false)
        .eq('is_spam', false)
        .eq('folder', 'inbox')

      ;(unreadData || []).forEach((row: any) => {
        unreadByIdentity[row.identity_id] = (unreadByIdentity[row.identity_id] || 0) + 1
      })
    }

    const enriched = sorted.map((i: any) => ({
      ...i,
      unread_count: unreadByIdentity[i.identity_id] || 0,
    }))

    return NextResponse.json({ 
      identities: enriched,
      total: enriched.length,
      total_unread: Object.values(unreadByIdentity).reduce((a, b) => a + b, 0),
    })
  } catch (e: any) {
    console.error('Fetch identities error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed to load identities', identities: [] }, 
      { status: 500 }
    )
  }
}