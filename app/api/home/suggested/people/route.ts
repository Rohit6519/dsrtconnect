import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10)

  if (!user) return NextResponse.json({ people: [] })

  try {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_type', 'user')
    const excludeIds = [user.id, ...((follows || []).map((f: any) => f.following_id))]

    const { data: people, error } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url, tagline, is_verified, follower_count')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .not('full_name', 'is', null)
      .order('follower_count', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json({ people: people || [] })
  } catch (e: any) {
    console.error('Suggested people error:', e)
    return NextResponse.json({ people: [], error: e?.message }, { status: 500 })
  }
}