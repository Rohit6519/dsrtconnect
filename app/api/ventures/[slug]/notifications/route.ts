import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id, user_id, founder_id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (venture.user_id !== user.id && venture.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data } = await supabase.from('venture_notifications')
    .select('*, users:from_user_id(id, full_name, username, avatar_url)')
    .eq('venture_id', venture.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ notifications: data || [] })
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (action === 'mark-all-read') {
    await supabase.from('venture_notifications').update({ read: true }).eq('venture_id', venture.id).eq('read', false)
    await supabase.from('ventures').update({ unread_notifications: 0 }).eq('id', venture.id)
    return NextResponse.json({ success: true })
  }

  const id = searchParams.get('id')
  if (id) {
    await supabase.from('venture_notifications').update({ read: true }).eq('id', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}