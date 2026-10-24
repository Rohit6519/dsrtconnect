import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'projects'
  const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 20)

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ items: [] })

  let items: any[] = []

  if (tab === 'projects') {
    const { data: recs } = await supabase.rpc('get_org_recommendations', {
      p_user_id: user.id,
      p_organization_id: org.id,
      p_entity_type: 'project',
      p_limit: limit,
    })

    const ids: string[] = ((recs as Array<{ id: string }>) || []).map(r => r.id)
    if (ids.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select(`
          id, slug, name, tagline, description, cover_image_url, icon, color,
          sector, category, tech_stack, tags, stage, status, traction_score,
          founder_id, user_id, team_size, created_at,
          users:founder_id (id, full_name, username, avatar_url)
        `)
        .in('id', ids)

      const rankMap = new Map<string, number>(ids.map((id, i) => [id, i]))
      items = (projects || []).sort(
        (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
      )
    }

    if (items.length === 0) {
      const { data: fallback } = await supabase
        .from('projects')
        .select(`
          id, slug, name, tagline, description, cover_image_url, icon, color,
          sector, category, tech_stack, tags, stage, status, traction_score,
          founder_id, user_id, team_size, created_at,
          users:founder_id (id, full_name, username, avatar_url)
        `)
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      items = fallback || []
    }
  } else if (tab === 'ventures') {
    const { data: recs } = await supabase.rpc('get_org_recommendations', {
      p_user_id: user.id,
      p_organization_id: org.id,
      p_entity_type: 'venture',
      p_limit: limit,
    })

    const ids: string[] = ((recs as Array<{ id: string }>) || []).map(r => r.id)
    if (ids.length > 0) {
      const { data: ventures } = await supabase
        .from('ventures')
        .select(`
          id, slug, name, tagline, description, logo_url, industry, sector,
          stage, tags, founder_id, user_id, follower_count, created_at,
          users:founder_id (id, full_name, username, avatar_url)
        `)
        .in('id', ids)

      const rankMap = new Map<string, number>(ids.map((id, i) => [id, i]))
      items = (ventures || []).sort(
        (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
      )
    }

    if (items.length === 0) {
      const { data: fallback } = await supabase
        .from('ventures')
        .select(`
          id, slug, name, tagline, description, logo_url, industry, sector,
          stage, tags, founder_id, user_id, follower_count, created_at,
          users:founder_id (id, full_name, username, avatar_url)
        `)
        .eq('organization_id', org.id)
        .order('created_at', { ascending: false })
        .limit(limit)
      items = fallback || []
    }
  } else if (tab === 'looking_for') {
    const { data: recs } = await supabase.rpc('get_org_recommendations', {
      p_user_id: user.id,
      p_organization_id: org.id,
      p_entity_type: 'looking_for',
      p_limit: limit,
    })

    const ids: string[] = ((recs as Array<{ id: string }>) || []).map(r => r.id)
    if (ids.length > 0) {
      const { data: lfs } = await supabase
        .from('venture_looking_for')
        .select(`
          id, venture_id, type, title, description, amount, count, urgency, created_at,
          ventures:venture_id (id, slug, name, logo_url, industry)
        `)
        .in('id', ids)

      const rankMap = new Map<string, number>(ids.map((id, i) => [id, i]))
      items = (lfs || []).sort(
        (a, b) => (rankMap.get(a.id) ?? 999) - (rankMap.get(b.id) ?? 999)
      )
    }

    if (items.length === 0) {
      const { data: fallback } = await supabase
        .from('venture_looking_for')
        .select(`
          id, venture_id, type, title, description, amount, count, urgency, created_at,
          ventures:venture_id (id, slug, name, logo_url, industry, organization_id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit * 2)
      items = (fallback || [])
        .filter((lf: any) => lf.ventures?.organization_id === org.id)
        .slice(0, limit)
    }
  } else if (tab === 'discussions') {
    const { data: discs } = await supabase
      .from('organization_discussions')
      .select(`
        id, title, content, category, tags, like_count, comment_count, view_count,
        is_pinned, created_at, user_id,
        users:user_id (id, full_name, username, avatar_url)
      `)
      .eq('organization_id', org.id)
      .order('is_pinned', { ascending: false })
      .order('last_activity_at', { ascending: false })
      .limit(limit)
    items = discs || []
  }

  // Track as seen for non-repeat algorithm
  const entityType = tab === 'looking_for' ? 'looking_for' : tab.slice(0, -1)
  if (items.length > 0 && ['project', 'venture', 'looking_for'].includes(entityType)) {
    const seenRows = items.map((item: any) => ({
      user_id: user.id,
      entity_type: entityType,
      entity_id: item.id,
    }))
    await supabase.from('user_seen_items').upsert(seenRows, {
      onConflict: 'user_id,entity_type,entity_id',
    })
  }

  return NextResponse.json({ items })
}