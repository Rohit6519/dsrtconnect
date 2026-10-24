import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ notifications: [] }, { status: 401 })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ notifications: [] }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select(`
        id, type, title, message, action_url, read, created_at,
        actor:users!notifications_actor_id_fkey(id, full_name, username, avatar_url)
      `)
      .eq('entity_type', 'project')
      .eq('entity_id', project.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error

    return NextResponse.json({
      notifications: notifications || [],
      unread_count: (notifications || []).filter((n: any) => !n.read).length,
    })
  } catch (e: any) {
    console.error('[Project Notifications API] error:', e)
    return NextResponse.json({ notifications: [] }, { status: 500 })
  }
}