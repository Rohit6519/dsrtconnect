import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/inbox/actions
// Body: { message_ids: string[], action: 'star'|'unstar'|'archive'|'trash'|'mark_read'|'mark_unread'|'restore' }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const messageIds: string[] = body.message_ids || []
  const action = body.action

  if (!messageIds.length) return NextResponse.json({ error: 'No messages specified' }, { status: 400 })

  const validActions = ['star', 'unstar', 'archive', 'trash', 'mark_read', 'mark_unread', 'restore']
  if (!validActions.includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  try {
    const patch: any = { updated_at: new Date().toISOString() }

    switch (action) {
      case 'star':        patch.is_starred = true; patch.starred_at = new Date().toISOString(); break
      case 'unstar':      patch.is_starred = false; patch.starred_at = null; break
      case 'archive':     patch.is_archived = true; patch.archived_at = new Date().toISOString(); patch.folder = 'archive'; break
      case 'trash':       patch.is_trashed = true; patch.folder = 'trash'; break
      case 'mark_read':   patch.is_read = true; patch.read_at = new Date().toISOString(); break
      case 'mark_unread': patch.is_read = false; patch.read_at = null; break
      case 'restore':     patch.is_trashed = false; patch.is_archived = false; patch.folder = 'inbox'; break
    }

    const { error } = await supabase
      .from('inbox_user_messages')
      .update(patch)
      .eq('user_id', user.id)
      .in('message_id', messageIds)

    if (error) throw error

    return NextResponse.json({ ok: true, action, count: messageIds.length })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
