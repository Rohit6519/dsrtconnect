import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20)

  try {
    // Try trending_score first (populated by fn_calculate_trending_scores)
    let { data: hashtags, error } = await supabase
      .from('hashtags')
      .select('id, tag, tag_normalized, post_count, post_count_24h, post_count_7d, trending_score')
      .eq('is_blocked', false)
      .gt('trending_score', 0)
      .order('trending_score', { ascending: false })
      .limit(limit)

    // Fallback: use post_count_7d if no trending scores yet
    if (!hashtags || hashtags.length === 0) {
      const fallback = await supabase
        .from('hashtags')
        .select('id, tag, tag_normalized, post_count, post_count_24h, post_count_7d, trending_score')
        .eq('is_blocked', false)
        .order('post_count', { ascending: false })
        .limit(limit)
      hashtags = fallback.data || []
    }

    return NextResponse.json({
      hashtags: hashtags.map(h => ({
        id: h.id,
        tag: h.tag,
        slug: h.tag_normalized,
        post_count: h.post_count,
        post_count_24h: h.post_count_24h,
        trending_score: h.trending_score,
      })),
    })
  } catch (e: any) {
    console.error('Trending hashtags error:', e)
    return NextResponse.json({ hashtags: [], error: e?.message }, { status: 500 })
  }
}