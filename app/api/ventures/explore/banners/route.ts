import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// VENTURES-ONLY defaults (never shared with Projects)
const DEFAULT_BANNERS = [
  {
    id: 'v1',
    title: 'Launch Your Venture',
    image_url: '/banners/venture-1.png',
    cta_route: '/ventures/new',
  },
  {
    id: 'v2',
    title: 'Raise with Confidence',
    image_url: '/banners/venture-2.png',
    cta_route: '/ventures',
  },
  {
    id: 'v3',
    title: 'Founder Assessment',
    image_url: '/banners/venture-3.png',
    cta_route: '/ventures',
  },
  {
    id: 'v4',
    title: 'Investor Matching',
    image_url: '/banners/venture-4.png',
    cta_route: '/investor',
  },
  {
    id: 'v5',
    title: 'Grow Your Startup',
    image_url: '/banners/venture-5.png',
    cta_route: '/ventures',
  },
]

export async function GET() {
  const supabase = await createClient()

  try {
    // Prefer venture-specific table if it exists
    const { data: ventureBanners, error: ventureErr } = await supabase
      .from('venture_explore_banners')
      .select('id, title, image_url, cta_route, priority, is_active')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(5)

    if (!ventureErr && ventureBanners && ventureBanners.length > 0) {
      return NextResponse.json({ banners: ventureBanners })
    }

    // Fallback: shared explore_banners filtered for ventures
    const { data: sharedBanners, error: sharedErr } = await supabase
      .from('explore_banners')
      .select('id, title, image_url, cta_route, priority, is_active, entity_type')
      .eq('is_active', true)
      .or('entity_type.eq.venture,entity_type.is.null')
      .order('priority', { ascending: true })
      .limit(5)

    if (!sharedErr && sharedBanners && sharedBanners.length > 0) {
      // Only return if they look venture-specific (avoid project images leaking)
      const mapped = sharedBanners.map((b: any) => ({
        id: b.id,
        title: b.title,
        image_url: b.image_url,
        cta_route: b.cta_route || '/ventures',
      }))
      return NextResponse.json({ banners: mapped })
    }

    // Ultimate fallback: local venture assets
    return NextResponse.json({ banners: DEFAULT_BANNERS })
  } catch (e: any) {
    console.error('[ventures/explore/banners] error:', e)
    return NextResponse.json({ banners: DEFAULT_BANNERS })
  }
}