import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ count: 0, folders: {} })

  try {
    // Total unread
    const { count: totalUnread } = await supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('status', 'unread')

    // Unread per folder
    const [appsRes, connsRes, notifsRes] = await Promise.all([
      supabase
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'unread')
        .in('message_type', ['role_application', 'looking_for_application']),
      supabase
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'unread')
        .in('message_type', ['connection_request', 'venture_connection', 'collaboration_request']),
      supabase
        .from('inbox_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'unread')
        .in('message_type', ['dsrt_official', 'system']),
    ])

    return NextResponse.json({
      count: totalUnread || 0,
      folders: {
        all: totalUnread || 0,
        unread: totalUnread || 0,
        applications: appsRes.count || 0,
        connections: connsRes.count || 0,
        notifications: notifsRes.count || 0,
      },
    })
  } catch {
    return NextResponse.json({ count: 0, folders: {} })
  }
}