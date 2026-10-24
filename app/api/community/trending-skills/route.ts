import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()

  const sinceDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: recentPosts }, { data: recentUserSkills }] = await Promise.all([
    supabase.from('posts').select('skills, tags, created_at').gte('created_at', sinceDate).limit(500),
    supabase.from('user_skills').select('skills(name), created_at').order('created_at', { ascending: false }).limit(300),
  ])

  const counts: Record<string, number> = {}

  ;(recentPosts || []).forEach(p => {
    const all = [...((p.skills as string[]) || []), ...((p.tags as string[]) || [])]
    all.forEach(s => {
      if (!s || typeof s !== 'string') return
      const key = s.trim()
      if (key.length < 2) return
      counts[key] = (counts[key] || 0) + 1
    })
  })

  ;(recentUserSkills || []).forEach((us: any) => {
    const name = us.skills?.name?.trim()
    if (!name) return
    counts[name] = (counts[name] || 0) + 0.5
  })

  const trending = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([name, count]) => ({ name, count: Math.round(count) }))

  return NextResponse.json({ skills: trending })
}