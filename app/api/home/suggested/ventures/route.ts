import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10)

  try {
    // Get ventures user already follows (to exclude)
    let excludeIds: string[] = []
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .eq('following_type', 'venture')
      excludeIds = (follows || []).map((f: any) => f.following_id)

      // Also exclude own ventures
      const { data: ownVentures } = await supabase
        .from('ventures')
        .select('id')
        .or(`founder_id.eq.${user.id},user_id.eq.${user.id}`)
      excludeIds = [...excludeIds, ...(ownVentures || []).map((v: any) => v.id)]
    }

    let query = supabase
      .from('ventures')
      .select('id, slug, name, tagline, logo_url, is_verified, follower_count')
      .eq('status', 'active')
      .order('follower_count', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data: ventures, error } = await query
    if (error) throw error

    return NextResponse.json({ ventures: ventures || [] })
  } catch (e: any) {
    console.error('Suggested ventures error:', e)
    return NextResponse.json({ ventures: [], error: e?.message }, { status: 500 })
  }
}