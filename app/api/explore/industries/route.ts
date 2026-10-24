import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const query = (searchParams.get('q') || '').trim()
  const limit = parseInt(searchParams.get('limit') || '12')

  try {
    // Typeahead search across all sectors
    if (query.length >= 1) {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name, slug, category, popular')
        .ilike('name', '%' + query + '%')
        .order('popular', { ascending: false })
        .order('name', { ascending: true })
        .limit(20)

      if (error) throw error
      return NextResponse.json({ results: data || [] })
    }

    // Personalized top industries
    let topIndustries: string[] = []
    if (user?.id) {
      const { data } = await supabase.rpc('get_user_top_industries', {
        p_user_id: user.id,
        p_limit: limit,
      })
      topIndustries = data || []
    }

    // Fallback
    if (topIndustries.length === 0) {
      const { data } = await supabase
        .from('sectors')
        .select('name')
        .eq('popular', true)
        .limit(limit)
      topIndustries = (data || []).map((s: any) => s.name)
    }

    return NextResponse.json({ industries: topIndustries })
  } catch (error: any) {
    console.error('Industries error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load industries', industries: [] },
      { status: 500 }
    )
  }
}
