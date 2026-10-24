import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/opportunities/categories
 *   ?flat=true — return flat list including subcategories
 *   ?q=<query> — search categories
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const flat = searchParams.get('flat') === 'true'
  const q = searchParams.get('q')?.trim().toLowerCase()

  try {
    let query = supabase.from('opportunity_categories')
      .select('id, parent_id, name, slug, description, icon, position, opportunity_count')
      .eq('is_active', true)
      .order('position')
      .order('name')

    if (q) {
      query = query.ilike('name', '%' + q + '%')
    }

    const { data: categories, error } = await query
    if (error) throw error

    const items = categories || []

    if (flat || q) {
      return NextResponse.json({ categories: items })
    }

    // Build tree
    const topLevel = items.filter(c => !c.parent_id)
    const bySlug = new Map(topLevel.map(c => [c.id, { ...c, subcategories: [] as any[] }]))

    for (const item of items) {
      if (item.parent_id && bySlug.has(item.parent_id)) {
        bySlug.get(item.parent_id)!.subcategories.push(item)
      }
    }

    return NextResponse.json({
      categories: Array.from(bySlug.values()),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, categories: [] }, { status: 500 })
  }
}