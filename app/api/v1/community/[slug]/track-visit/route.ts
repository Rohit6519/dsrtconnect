import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, NotFoundError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id, view_count')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    await supabase.from('community_visits_v2').insert({
      identity_id: ctx.identityId,
      community_id: community.id,
      source: 'community_page',
    })

    // Increment view_count (best effort)
    await supabase
      .from('communities')
      .update({ view_count: (community.view_count ?? 0) + 1 })
      .eq('id', community.id)

    return ok({ tracked: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}