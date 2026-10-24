import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// DELETE: permanently delete or trash a quarantined thread
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: userIdentities } = await supabase.rpc('fn_get_user_mail_identities', {
      p_user_id: user.id,
    })
    const ownedIds = (userIdentities || []).map((i: any) => i.identity_id)

    if (ownedIds.length === 0) {
      return NextResponse.json({ error: 'No mail identity' }, { status: 403 })
    }

    const { error } = await supabase
      .from('mail_thread_participants')
      .update({
        is_trashed: true,
        folder: 'trash',
      })
      .eq('thread_id', threadId)
      .in('identity_id', ownedIds)

    if (error) throw error

    return NextResponse.json({ success: true, thread_id: threadId, trashed: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to delete threat' }, { status: 500 })
  }
}