import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VentureExploreEngine } from '@/lib/venture-explore/engine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id') || undefined
  const activeTab = searchParams.get('vtab') || 'recommended'
  const cursor = searchParams.get('cursor') || undefined
  
  const filters = {
    search: searchParams.get('q') || undefined,
    domains: searchParams.get('domain')?.split(',').filter(Boolean),
    stages: searchParams.get('stage')?.split(',').filter(Boolean),
    locations: searchParams.get('location')?.split(',').filter(Boolean),
    venture_types: searchParams.get('type')?.split(',').filter(Boolean),
    business_models: searchParams.get('model')?.split(',').filter(Boolean),
    team_sizes: searchParams.get('team')?.split(',').filter(Boolean),
    funding_stages: searchParams.get('funding')?.split(',').filter(Boolean),
    is_verified: searchParams.get('verified') === '1',
    is_hiring: searchParams.get('hiring') === '1',
    is_seeking_investment: searchParams.get('investment') === '1',
    is_seeking_cofounder: searchParams.get('cofounder') === '1',
    is_newly_launched: searchParams.get('fresh') === '1',
    sort: (searchParams.get('sort') as any) || 'recommended',
  }

  try {
    // Determine A/B ranking version for user
    const { data: version } = await supabase.rpc('fn_get_ranking_version', { p_user_id: user?.id || null })
    const variant = version || 'venture-explore-v1'

    const engine = new VentureExploreEngine(supabase, user?.id, sessionId, variant)
    const feed = await engine.generateFeed(filters, activeTab, cursor)
    
    return NextResponse.json({ ...feed, ranking_version: variant })
  } catch (e: any) {
    console.error('Explore feed API error:', e)
    return NextResponse.json({ modules: [], nextCursor: null, error: e.message }, { status: 500 })
  }
}