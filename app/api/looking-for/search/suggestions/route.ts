import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/search/suggestions?field=skills|industries|locations&q=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const field = searchParams.get('field') || 'skills'
  const q = (searchParams.get('q') || '').trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 25)

  if (field === 'skills') {
    let query = supabase.from('skills').select('id, name, category, usage_count')
      .order('usage_count', { ascending: false }).limit(limit)
    if (q) query = query.ilike('name', `%${q}%`)
    const { data } = await query
    return NextResponse.json({ suggestions: data || [] })
  }

  if (field === 'industries') {
    let query = supabase.from('sectors').select('id, name, slug, category, popular')
      .order('popular', { ascending: false }).limit(limit)
    if (q) query = query.ilike('name', `%${q}%`)
    const { data } = await query
    return NextResponse.json({ suggestions: data || [] })
  }

  if (field === 'locations') {
    let query = supabase.from('locations').select('id, city, country, display, usage_count')
      .order('usage_count', { ascending: false }).limit(limit)
    if (q) query = query.or(`city.ilike.%${q}%,country.ilike.%${q}%,display.ilike.%${q}%`)
    const { data } = await query
    return NextResponse.json({ suggestions: data || [] })
  }

  return NextResponse.json({ suggestions: [] })
}
