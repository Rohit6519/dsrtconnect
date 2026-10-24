import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PROJECT_DOMAINS } from '@/lib/config/project-domains'
import { VENTURE_DOMAINS } from '@/lib/config/venture-domains'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sectors/search?q=&limit=600&type=project|venture|all
 *
 * Returns sectors/domains for autocomplete.
 * Combines project + venture domains by default.
 * Legacy compatibility endpoint for existing ExploreView component.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const limit = Math.min(parseInt(searchParams.get('limit') || '600'), 1000)
  const type = searchParams.get('type') || 'all'

  // Pick source
  let source: any[] = []
  if (type === 'project') {
    source = PROJECT_DOMAINS
  } else if (type === 'venture') {
    source = VENTURE_DOMAINS
  } else {
    // Merge, dedupe by name
    const seen = new Set<string>()
    const combined: any[] = []
    ;[...PROJECT_DOMAINS, ...VENTURE_DOMAINS].forEach(d => {
      const key = d.name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        combined.push(d)
      }
    })
    source = combined
  }

  // Filter by query
  let filtered = source
  if (q && q.length >= 1) {
    filtered = source.filter((d: any) => {
      const name = d.name.toLowerCase()
      if (q.length <= 2) {
        return name.startsWith(q) || name.includes(' ' + q)
      }
      return name.includes(q) || (d.aliases || []).some((a: string) => a.toLowerCase().includes(q))
    })
  }

  // Shape as sectors (legacy shape expected by ExploreView)
  const sectors = filtered.slice(0, limit).map((d: any, i: number) => ({
    id: d.slug || String(i),
    name: d.name,
    slug: d.slug,
    category: d.category,
    popular: d.popular || false,
  }))

  return NextResponse.json({ sectors })
}