import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ProjectExploreEngine } from '@/lib/project-explore/engine'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id') || undefined
  const activeTab = searchParams.get('ptab') || 'recommended'
  const cursor = searchParams.get('cursor') || undefined

  const filters = {
    search: searchParams.get('q') || undefined,
    domains: searchParams.get('domain')?.split(',').filter(Boolean),
    technologies: searchParams.get('tech')?.split(',').filter(Boolean),
    stages: searchParams.get('stage')?.split(',').filter(Boolean),
    project_types: searchParams.get('ptype')?.split(',').filter(Boolean),
    locations: searchParams.get('location')?.split(',').filter(Boolean),
    licenses: searchParams.get('license')?.split(',').filter(Boolean),
    is_open_source: searchParams.get('oss') === '1',
    is_hiring: searchParams.get('hiring') === '1',
    is_looking_for_collaborators: searchParams.get('collab') === '1',
    is_verified: searchParams.get('verified') === '1',
    is_newly_launched: searchParams.get('fresh') === '1',
    has_repository: searchParams.get('repo') === '1',
    sort: (searchParams.get('sort') as any) || 'recommended',
  }

  try {
    // Optional A/B variant resolution
    let variant = 'v1'
    if (user?.id) {
      try {
        const { data: v } = await supabase.rpc('fn_get_ranking_version', { p_user_id: user.id })
        if (v) variant = v
      } catch {
        // Silent fallback — table may not exist yet
      }
    }

    const engine = new ProjectExploreEngine(supabase, user?.id, sessionId, variant)
    const feed = await engine.generateFeed(filters, activeTab, cursor)

    return NextResponse.json(feed)
  } catch (e: any) {
    console.error('[projects/explore/feed] error:', e)
    return NextResponse.json(
      { modules: [], nextCursor: null, error: e?.message },
      { status: 500 }
    )
  }
}