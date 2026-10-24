import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, NotFoundError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: seed } = await supabase
      .from('communities')
      .select('id, category, community_type, topics, visibility')
      .eq('slug', slug)
      .maybeSingle()
    if (!seed) throw new NotFoundError('Community', slug)

    const filters = supabase
      .from('communities')
      .select('id, slug, name, short_description, cover_url, category, member_count, is_verified')
      .neq('id', seed.id)
      .eq('status', 'ACTIVE')
      .in('visibility', ['PUBLIC', 'UNLISTED'])
      .limit(24)

    const results = await filters
    let items = (results.data || []) as any[]

    // Simple rank by topic overlap + category match + members
    const seedTopics: string[] = seed.topics || []
    items = items
      .map((c) => {
        let score = 0
        if (seed.category && c.category === seed.category) score += 4
        const overlap = ((c.topics || []) as string[]).filter((t: string) => seedTopics.includes(t)).length
        score += overlap * 3
        score += Math.log10((c.member_count || 0) + 1)
        return { c, score }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(({ c }) => c)

    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}