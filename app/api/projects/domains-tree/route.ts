import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 600

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const query = searchParams.get('q')?.toLowerCase().trim() || ''
  const popular = searchParams.get('popular') === '1'
  const category = searchParams.get('category') || null
  const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 600)

  try {
    let dbQuery = supabase
      .from('project_domains_taxonomy')
      .select('id, name, slug, category, parent_id, level, is_popular, sort_order')
      .eq('is_active', true)

    if (category) dbQuery = dbQuery.eq('category', category)
    if (popular) dbQuery = dbQuery.eq('is_popular', true)

    if (query.length >= 1) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,slug.ilike.%${query}%`)
    }

    const { data, error } = await dbQuery
      .order('is_popular', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
      .limit(limit)

    if (error) throw error

    const domains = data || []

    // Group by category for sidebar structure
    const byCategory: Record<string, any[]> = {}
    for (const d of domains) {
      const cat = d.category || 'Other'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(d)
    }

    return NextResponse.json({
      domains,
      by_category: byCategory,
      total: domains.length,
    })
  } catch (e: any) {
    console.error('[projects/domains-tree] error:', e)
    return NextResponse.json({ domains: [], by_category: {} }, { status: 500 })
  }
}