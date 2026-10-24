import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || null
  const scope = searchParams.get('scope') || 'all'  // 'foryou' or 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    // Both scopes use the same RPC; "foryou" adds personalization signals in future
    const { data, error } = await supabase.rpc('get_venture_opportunities', {
      p_user_id: user?.id || null,
      p_type: type === 'all' ? null : type,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error
    let results = data || []

    // For "foryou" — filter to opportunities whose venture matches user interests
    if (scope === 'foryou' && user?.id && results.length > 0) {
      const { data: profile } = await supabase
        .from('users')
        .select('interest_topics')
        .eq('id', user.id)
        .single()

      const interests = (profile?.interest_topics || []) as string[]
      if (interests.length > 0) {
        const interestSet = new Set(interests.map((i: string) => i.toLowerCase()))
        results = results.filter((r: any) => {
          const industry = (r.venture_industry || '').toLowerCase()
          if (interestSet.has(industry)) return true
          const skills = r.skills || []
          return skills.some((s: string) => interestSet.has(s.toLowerCase()))
        })
      }
    }

    return NextResponse.json({
      opportunities: results,
      pagination: {
        limit, offset, count: results.length,
        hasMore: results.length >= limit,
        nextOffset: offset + results.length,
      },
    })
  } catch (e: any) {
    console.error('Opportunities error:', e)
    return NextResponse.json({ error: e?.message, opportunities: [] }, { status: 500 })
  }
}
