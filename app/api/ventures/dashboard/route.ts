import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const uid = user?.id || null

  const { searchParams } = new URL(request.url)
  const industry = searchParams.get('industry') || 'all'

  try {
    const [
      myVenturesRes,
      followingRes,
      savedRes,
      featuredRes,
      recommendedRes,
      opportunitiesRes,
      categoriesRes,
    ] = await Promise.all([
      // My ventures
      uid ? supabase
        .from('ventures')
        .select('*, team_members:venture_team_members(id)')
        .or('founder_id.eq.' + uid + ',user_id.eq.' + uid)
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),

      // Following ventures
      uid ? supabase
        .from('follows')
        .select('following_id, created_at, venture:ventures!inner(*)')
        .eq('follower_id', uid)
        .eq('following_type', 'venture')
        .order('created_at', { ascending: false })
        .limit(20)
      : Promise.resolve({ data: [], error: null }),

      // Saved ventures
      uid ? supabase
        .from('venture_saves')
        .select('venture_id, saved_at, venture:ventures!inner(*)')
        .eq('user_id', uid)
        .order('saved_at', { ascending: false })
        .limit(20)
      : Promise.resolve({ data: [], error: null }),

      // Featured ventures (top 5 by traction, public)
      supabase
        .from('ventures')
        .select('*, founder:users!ventures_user_id_fkey(id, full_name, username, avatar_url, is_verified)')
        .eq('status', 'active')
        .or('is_building_public.eq.true,show_in_explore.eq.true')
        .order('traction_score', { ascending: false })
        .limit(5),

      // Recommended ventures (personalized)
      supabase.rpc('dsrt_recommend_ventures', {
        p_user_id: uid,
        p_industry: industry === 'all' ? null : industry,
        p_stage: null,
        p_opportunity: null,
        p_sort: 'recommended',
        p_limit: 12,
        p_offset: 0,
      }),

      // Recent opportunities
      supabase.rpc('get_venture_opportunities', {
        p_user_id: uid,
        p_type: null,
        p_limit: 8,
        p_offset: 0,
      }),

      // Distinct industries from active ventures + top from sectors
      supabase
        .from('ventures')
        .select('industry')
        .eq('status', 'active')
        .not('industry', 'is', null),
    ])

    // Extract industry counts
    const industryCounts: Record<string, number> = {}
    for (const row of (categoriesRes.data || [])) {
      const ind = (row as any).industry
      if (ind) industryCounts[ind] = (industryCounts[ind] || 0) + 1
    }

    return NextResponse.json({
      myVentures: myVenturesRes.data || [],
      following: (followingRes.data || []).map((f: any) => f.venture).filter(Boolean),
      saved: (savedRes.data || []).map((s: any) => s.venture).filter(Boolean),
      featured: featuredRes.data || [],
      recommended: recommendedRes.data || [],
      opportunities: opportunitiesRes.data || [],
      industryCounts,
      stats: {
        totalMyVentures: (myVenturesRes.data || []).length,
        totalFollowing: (followingRes.data || []).length,
        totalSaved: (savedRes.data || []).length,
      },
    })
  } catch (e: any) {
    console.error('Ventures dashboard error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
