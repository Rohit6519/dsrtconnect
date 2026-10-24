import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_SORTS = ['recommended','traction','most_followed','newest','oldest']

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const industry = searchParams.get('industry') || 'all'
  const stage = searchParams.get('stage') || 'all'
  const opportunity = searchParams.get('opportunity') || 'all'
  const sortInput = searchParams.get('sort') || 'recommended'
  const sort = VALID_SORTS.includes(sortInput) ? sortInput : 'recommended'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const { data, error } = await supabase.rpc('dsrt_recommend_ventures', {
      p_user_id: user?.id || null,
      p_industry: industry === 'all' ? null : industry,
      p_stage: stage === 'all' ? null : stage,
      p_opportunity: opportunity === 'all' ? null : opportunity,
      p_sort: sort,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error
    const results = data || []

    return NextResponse.json({
      results,
      pagination: {
        limit, offset, count: results.length,
        hasMore: results.length >= limit,
        nextOffset: offset + results.length,
      },
    })
  } catch (e: any) {
    console.error('Recommendations error:', e)
    return NextResponse.json({ error: e?.message, results: [] }, { status: 500 })
  }
}
