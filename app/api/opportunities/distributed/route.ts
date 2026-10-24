import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/opportunities/distributed?type=project&id=<uuid>
 * Returns active, public opportunities distributed to this entity.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const sp = new URL(req.url).searchParams
  const destType = sp.get('type') // 'project' | 'venture' | 'community'
  const destId = sp.get('id')

  if (!destType || !destId) {
    return NextResponse.json({ error: 'type and id required' }, { status: 400 })
  }

  try {
    // Find active distributions
    const { data: dists } = await supabase
      .from('opportunity_distribution')
      .select('opportunity_id')
      .eq('destination_type', destType)
      .eq('destination_id', destId)
      .eq('status', 'active')

    if (!dists || dists.length === 0) {
      return NextResponse.json({ opportunities: [] })
    }

    const oppIds = dists.map(d => d.opportunity_id)

    // Fetch the actual opportunities (must be public & active/closing-soon)
    const { data: opps } = await supabase
      .from('opportunities')
      .select('id, slug, title, opportunity_type, status, work_mode, location, compensation_type, compensation_min, compensation_max, compensation_currency, published_at, poster_user_id')
      .in('id', oppIds)
      .eq('visibility', 'public')
      .in('status', ['active', 'closing-soon'])
      .order('published_at', { ascending: false })

    if (!opps || opps.length === 0) {
      return NextResponse.json({ opportunities: [] })
    }

    // Enrich poster info
    const posterIds = [...new Set(opps.map(o => o.poster_user_id).filter(Boolean))]
    const { data: posters } = posterIds.length 
      ? await supabase.from('users').select('id, full_name, username, avatar_url, is_verified').in('id', posterIds)
      : { data: [] }
    
    const posterMap = new Map((posters || []).map((p: any) => [p.id, p]))

    const enriched = opps.map(o => ({
      ...o,
      poster: posterMap.get(o.poster_user_id) || null
    }))

    return NextResponse.json({ opportunities: enriched })
  } catch (e: any) {
    console.error('Distributed fetch error:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}