import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/explore/communities
 *   ?q=iit         — search all communities
 *   ?limit=20      — max results
 *
 * Without ?q: returns user's memberships + explicitly-preferred communities
 * With ?q: searches ALL DSRT communities
 * FIXED: Uses cover_url (actual column) not cover_image_url
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50)

  // ─── SEARCH MODE ───
  if (q && q.length >= 1) {
    try {
      const { data: nameMatches } = await supabase
        .from('communities')
        .select('id, name, slug, member_count, description, cover_url, banner_url, icon, category, is_verified')
        .ilike('name', '%' + q + '%')
        .order('member_count', { ascending: false, nullsFirst: false })
        .limit(limit)

      let results = nameMatches || []

      if (results.length < limit) {
        const remaining = limit - results.length
        const excludeIds = results.map(r => r.id)

        let descQuery = supabase
          .from('communities')
          .select('id, name, slug, member_count, description, cover_url, banner_url, icon, category, is_verified')
          .ilike('description', '%' + q + '%')
          .order('member_count', { ascending: false, nullsFirst: false })
          .limit(remaining)

        if (excludeIds.length > 0) {
          descQuery = descQuery.not('id', 'in', '(' + excludeIds.join(',') + ')')
        }

        const { data: descMatches } = await descQuery
        if (descMatches) results = [...results, ...descMatches]
      }

      return NextResponse.json({
        communities: results.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          member_count: c.member_count || 0,
          description: c.description,
          cover_url: c.cover_url,
          banner_url: c.banner_url,
          icon: c.icon,
          category: c.category,
          is_verified: c.is_verified || false,
        })),
      })
    } catch (e: any) {
      console.error('Community search error:', e)
      return NextResponse.json({ error: e?.message, communities: [] }, { status: 500 })
    }
  }

  // ─── USER'S COMMUNITIES MODE ───
  if (!user) return NextResponse.json({ communities: [] })

  try {
    const { data: profile } = await supabase
      .from('users')
      .select('preferred_community_ids')
      .eq('id', user.id)
      .maybeSingle()

    const preferredIds = (profile?.preferred_community_ids as string[]) || []

    const { data: memberships } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .limit(100)

    const membershipIds = (memberships || []).map((m: any) => m.community_id).filter(Boolean)

    const allIds = Array.from(new Set([...preferredIds, ...membershipIds]))

    if (allIds.length === 0) {
      return NextResponse.json({ communities: [], memberships: [], preferred: [] })
    }

    const { data: communities, error } = await supabase
      .from('communities')
      .select('id, name, slug, member_count, description, cover_url, banner_url, icon, category, is_verified')
      .in('id', allIds)
      .order('member_count', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (error) throw error

    const shaped = (communities || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      member_count: c.member_count || 0,
      description: c.description,
      cover_url: c.cover_url,
      banner_url: c.banner_url,
      icon: c.icon,
      category: c.category,
      is_verified: c.is_verified || false,
      is_member: membershipIds.includes(c.id),
      is_preferred: preferredIds.includes(c.id),
    }))

    return NextResponse.json({
      communities: shaped,
      memberships: membershipIds,
      preferred: preferredIds,
    })
  } catch (e: any) {
    console.error('Communities fetch error:', e)
    return NextResponse.json({ error: e?.message, communities: [] }, { status: 500 })
  }
}