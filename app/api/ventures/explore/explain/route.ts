import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const ventureId = searchParams.get('venture_id')
  
  if (!ventureId) return NextResponse.json({ error: 'venture_id required' }, { status: 400 })

  try {
    // Get venture signals
    const { data: v } = await supabase
      .from('ventures')
      .select('id, industry, sector, sub_category, stage, is_verified, created_at, last_activity_at, trending:venture_trending_scores(bayesian_score, growth_rate)')
      .eq('id', ventureId)
      .single()

    // Get user long-term affinities
    const { data: affinities } = await supabase
      .from('user_domain_affinity')
      .select('domain_slug, score')
      .eq('user_id', user?.id || null)

    const bayesian = v?.trending?.[0]?.bayesian_score || 0
    const growth = v?.trending?.[0]?.growth_rate || 0

    return NextResponse.json({
      venture: v?.id,
      domains: [v?.industry, v?.sector, v?.sub_category].filter(Boolean),
      is_verified: v?.is_verified,
      bayesian_quality_score: bayesian,
      recent_growth_rate: growth,
      user_long_term_affinity: affinities
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}