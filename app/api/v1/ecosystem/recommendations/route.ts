import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { refreshRecommendations } from '@/lib/ecosystem/recommendation'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const entityType = req.nextUrl.searchParams.get('type') || 'community'
    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '12'), 30)

    const { data: cached } = await supabase
      .from('ecosystem_recommendation_candidates')
      .select('*')
      .eq('identity_id', ctx.identityId)
      .eq('entity_type', entityType)
      .gte('expires_at', new Date().toISOString())
      .order('score', { ascending: false })
      .limit(limit)

    if (cached && cached.length >= 3) {
      return ok({ items: cached, source: 'cache' }, { ctx })
    }

    // Refresh on-demand
    await refreshRecommendations(supabase, ctx.identityId)

    const { data: fresh } = await supabase
      .from('ecosystem_recommendation_candidates')
      .select('*')
      .eq('identity_id', ctx.identityId)
      .eq('entity_type', entityType)
      .order('score', { ascending: false })
      .limit(limit)

    return ok({ items: fresh || [], source: 'fresh' }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}