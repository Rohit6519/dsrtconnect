import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 300

// Return a curated set of top venture categories + full sector list
const VENTURE_CATEGORIES = [
  { slug: 'all', name: 'All', icon: 'Globe' },
  { slug: 'ai-ml', name: 'AI & ML', icon: 'Robot' },
  { slug: 'saas', name: 'SaaS', icon: 'Cloud' },
  { slug: 'fintech', name: 'FinTech', icon: 'CurrencyCircleDollar' },
  { slug: 'healthtech', name: 'HealthTech', icon: 'Heartbeat' },
  { slug: 'climate', name: 'Climate', icon: 'Leaf' },
  { slug: 'robotics', name: 'Robotics', icon: 'Robot' },
  { slug: 'edtech', name: 'EdTech', icon: 'GraduationCap' },
  { slug: 'deeptech', name: 'DeepTech', icon: 'Atom' },
  { slug: 'consumer', name: 'Consumer', icon: 'ShoppingBag' },
  { slug: 'web3', name: 'Web3', icon: 'Cube' },
  { slug: 'biotech', name: 'Biotech', icon: 'Dna' },
  { slug: 'hardware', name: 'Hardware', icon: 'Cpu' },
  { slug: 'space', name: 'Space', icon: 'Rocket' },
  { slug: 'other', name: 'Other', icon: 'DotsThreeCircle' },
]

export async function GET() {
  const supabase = await createClient()
  try {
    // Get venture counts per industry
    const { data: ventures } = await supabase
      .from('ventures')
      .select('industry, sector')
      .eq('status', 'active')

    const counts: Record<string, number> = {}
    for (const v of (ventures || [])) {
      const ind = ((v as any).industry || '').toLowerCase()
      const sec = ((v as any).sector || '').toLowerCase()
      if (ind) counts[ind] = (counts[ind] || 0) + 1
      if (sec) counts[sec] = (counts[sec] || 0) + 1
    }

    const categories = VENTURE_CATEGORIES.map(c => {
      // Sum up counts across variations
      let count = 0
      const searchTerms = c.name.toLowerCase().split(/[\s&]+/)
      for (const [key, val] of Object.entries(counts)) {
        if (searchTerms.some(t => key.includes(t))) count += val
      }
      if (c.slug === 'all') count = (ventures || []).length
      return { ...c, count }
    })

    // Also return the full sectors list for advanced filtering
    const { data: allSectors } = await supabase
      .from('sectors')
      .select('id, name, slug, category, popular')
      .order('popular', { ascending: false })
      .order('name', { ascending: true })

    return NextResponse.json({
      categories,
      allSectors: allSectors || [],
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, categories: VENTURE_CATEGORIES }, { status: 500 })
  }
}
