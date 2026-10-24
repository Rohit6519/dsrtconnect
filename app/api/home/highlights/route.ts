import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()

  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [venturesThisWeek, projectsThisMonth, activeOpportunities, activePeople] = await Promise.all([
      supabase.from('ventures').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo).then(r => r.count || 0),
      supabase.from('projects').select('id', { count: 'exact', head: true }).gte('created_at', monthAgo).then(r => r.count || 0),
      supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('visibility', 'public').then(r => r.count || 0, () => 0),
      supabase.from('posts').select('user_id', { count: 'exact', head: true }).gte('created_at', weekAgo).then(r => r.count || 0),
    ])

    return NextResponse.json({
      highlights: [
        { label: 'ventures launched this week', value: venturesThisWeek, href: '/ventures' },
        { label: 'new projects started this month', value: projectsThisMonth, href: '/projects' },
        { label: 'open opportunities right now', value: activeOpportunities, href: '/looking-for' },
        { label: 'builders active this week', value: activePeople, href: '/explore' },
      ],
    })
  } catch (e: any) {
    console.error('Highlights error:', e)
    return NextResponse.json({ highlights: [] }, { status: 500 })
  }
}