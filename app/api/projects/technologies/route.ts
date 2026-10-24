import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 300

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')?.toLowerCase().trim() || ''
  const category = searchParams.get('category') || null
  const popular = searchParams.get('popular') === '1'
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 200)

  try {
    let dbQuery = supabase
      .from('project_technologies_taxonomy')
      .select('id, name, slug, category, aliases, icon_url, is_popular')
      .eq('is_active', true)

    if (category) {
      dbQuery = dbQuery.eq('category', category)
    }

    if (popular) {
      dbQuery = dbQuery.eq('is_popular', true)
    }

    // Search: match on name or aliases
    if (query.length >= 1) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery
      .order('is_popular', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit)

    if (error) throw error

    let technologies = data || []

    // In-memory alias match (Postgres array text search is fiddly)
    if (query.length >= 1) {
      technologies = technologies.filter(t => {
        const nameMatch = t.name.toLowerCase().includes(query)
        const slugMatch = t.slug.toLowerCase().includes(query)
        const aliasMatch = (t.aliases || []).some((a: string) => a.toLowerCase().includes(query))
        return nameMatch || slugMatch || aliasMatch
      })
    }

    // Group by category for UI convenience
    const byCategory: Record<string, any[]> = {}
    for (const t of technologies) {
      const cat = t.category || 'Other'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(t)
    }

    return NextResponse.json({
      technologies,
      by_category: byCategory,
      total: technologies.length,
    })
  } catch (e: any) {
    console.error('[projects/technologies] error:', e)
    return NextResponse.json({ technologies: [], by_category: {} }, { status: 500 })
  }
}