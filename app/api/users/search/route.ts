import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const rawQ = sp.get('q') || ''
  const q = rawQ.trim().replace(/^@/, '').replace(/[%_\\]/g, '')
  const limit = Math.min(parseInt(sp.get('limit') || '8', 10), 20)

  if (!q) return NextResponse.json({ users: [] })

  try {
    const pattern = `%${q}%`

    // Run parallel queries for username and full_name to guarantee instant PostgREST matches
    const [byUsername, byFullName] = await Promise.all([
      supabase
        .from('users')
        .select('id, username, full_name, avatar_url, is_verified, tagline')
        .ilike('username', pattern)
        .limit(limit),
      supabase
        .from('users')
        .select('id, username, full_name, avatar_url, is_verified, tagline')
        .ilike('full_name', pattern)
        .limit(limit),
    ])

    const map = new Map<string, any>()
    for (const u of (byUsername.data || [])) map.set(u.id, u)
    for (const u of (byFullName.data || [])) map.set(u.id, u)

    const users = Array.from(map.values()).slice(0, limit)
    return NextResponse.json({ users })
  } catch (e: any) {
    console.error('User search error:', e)
    return NextResponse.json({ error: e?.message || 'Search failed', users: [] }, { status: 500 })
  }
}