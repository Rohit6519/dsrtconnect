import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_BANNERS = [
  { id: 'p1', title: 'Share Your Experiments', image_url: '/banners/project-1.png', cta_route: '/projects/create' },
  { id: 'p2', title: 'Build with COCO',         image_url: '/banners/project-2.png', cta_route: '/coco' },
  { id: 'p3', title: 'Find Collaborators',      image_url: '/banners/project-3.png', cta_route: '/looking-for' },
  { id: 'p4', title: 'Start a Project',         image_url: '/banners/project-4.png', cta_route: '/projects/create' },
  { id: 'p5', title: 'Open Source on DSRT',     image_url: '/banners/project-5.png', cta_route: '/projects?tab=explore' },
]

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: dbBanners } = await supabase
      .from('project_explore_banners')
      .select('id, title, image_url, cta_route')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (dbBanners && dbBanners.length > 0) {
      return NextResponse.json({ banners: dbBanners })
    }

    return NextResponse.json({ banners: DEFAULT_BANNERS })
  } catch {
    return NextResponse.json({ banners: DEFAULT_BANNERS })
  }
}