import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ unread: 0, total: 0 })

  try {
    const [unreadRes, totalRes] = await Promise.all([
      supabase.from('home_notifications').select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id).eq('is_read', false),
      supabase.from('home_notifications').select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id),
    ])
    return NextResponse.json({
      unread: unreadRes.count || 0,
      total: totalRes.count || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ unread: 0, total: 0 })
  }
}