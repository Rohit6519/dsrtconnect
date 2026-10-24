import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: project } = await supabase.from('projects')
    .select('id, founder_id, user_id').eq('slug', slug).single()

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (project.founder_id !== user.id && project.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30')

  const { data: stats } = await supabase.rpc('fn_get_project_stats', {
    p_project_id: project.id,
  })

  const { data: daily } = await supabase.rpc('fn_get_project_analytics', {
    p_project_id: project.id,
    p_days: days,
  })

  return NextResponse.json({
    stats: stats?.[0] || {
      total_views: 0, unique_views: 0, total_followers: 0,
      total_applications: 0, total_saves: 0, views_last_7d: 0, views_last_30d: 0,
    },
    daily: daily || [],
    days,
  })
}
