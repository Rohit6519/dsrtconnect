import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const industry = searchParams.get('industry') || 'all'
  const sort = searchParams.get('sort') || 'recommended'
  const uid = user?.id || null

  try {
    const [
      industriesResult,
      bannersResult,
      recommendationsResult,
      allSectorsResult,
    ] = await Promise.all([
      // Personalized top industries for the user
      uid
        ? supabase.rpc('get_user_top_industries', { p_user_id: uid, p_limit: 12 })
        : Promise.resolve({ data: null, error: null }),

      // Featured banners (6 slots)
      supabase.rpc('get_featured_banners'),

      // Initial 24 recommendations
      supabase.rpc('dsrt_recommend_projects', {
        p_user_id: uid,
        p_industry: industry === 'all' ? null : industry,
        p_sort: sort,
        p_limit: 24,
        p_offset: 0,
      }),

      // Full sectors list for the "More" dropdown
      supabase
        .from('sectors')
        .select('id, name, slug, category, popular')
        .order('popular', { ascending: false })
        .order('name', { ascending: true }),
    ])

    // Fallback for anon users: use popular sectors
    let topIndustries: string[] = industriesResult.data || []
    if (!uid || !topIndustries || topIndustries.length === 0) {
      const popular = (allSectorsResult.data || [])
        .filter((s: any) => s.popular)
        .slice(0, 12)
        .map((s: any) => s.name)
      topIndustries = popular.length > 0 ? popular : (allSectorsResult.data || []).slice(0, 12).map((s: any) => s.name)
    }

    return NextResponse.json({
      topIndustries,
      allSectors: allSectorsResult.data || [],
      banners: bannersResult.data || [],
      recommendations: recommendationsResult.data || [],
      hasMore: (recommendationsResult.data || []).length >= 24,
    })
  } catch (error: any) {
    console.error('Explore dashboard error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
