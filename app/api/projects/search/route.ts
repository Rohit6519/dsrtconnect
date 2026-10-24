import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || ''
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const { data, error } = await supabase.rpc('search_projects', {
      p_query: query,
      p_limit: limit,
    })

    if (error) throw error
    return NextResponse.json({ results: data || [] })
  } catch (error: any) {
    console.error('Search error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
