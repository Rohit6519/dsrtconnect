import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/community/search?q=iit&limit=10
 * Returns: { communities: [{ id, name, slug, member_count, description }] }
 * FIXED: Uses cover_url (actual column) not cover_image_url
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

  if (!q || q.length < 1) return NextResponse.json({ communities: [] })

  try {
    const { data: nameMatches, error: nameErr } = await supabase
      .from('communities')
      .select('id, name, slug, member_count, description, cover_url, banner_url, icon, category, is_verified')
      .ilike('name', '%' + q + '%')
      .order('member_count', { ascending: false, nullsFirst: false })
      .limit(limit)

    if (nameErr) throw nameErr

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
      if (descMatches) {
        results = [...results, ...descMatches]
      }
    }

    if (user && q.length >= 2) {
      supabase.from('user_search_history').insert({
        user_id: user.id,
        query: q,
      }).then(() => {}, () => {})

      supabase.from('trending_search_terms').upsert({
        term: q.toLowerCase(),
        search_count: 1,
        last_searched_at: new Date().toISOString(),
      }, { onConflict: 'term' }).then(() => {}, () => {})
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