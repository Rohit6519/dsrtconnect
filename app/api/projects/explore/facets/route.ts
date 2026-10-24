import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 60

export async function GET() {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.rpc('fn_get_project_explore_facets')
    if (error) throw error

    return NextResponse.json(
      { facets: data || {} },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (e: any) {
    console.error('[projects/explore/facets] error:', e)
    return NextResponse.json({ facets: {} }, { status: 500 })
  }
}