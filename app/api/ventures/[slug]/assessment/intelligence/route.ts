import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/ventures/[slug]/assessment/intelligence
 * Returns current intelligence vector. Recomputes if stale (>10 min).
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id, intelligence_score, intelligence_vector, intelligence_calculated_at')
    .eq('slug', slug)
    .maybeSingle()
  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (venture.user_id !== user.id && venture.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const isStale = !venture.intelligence_calculated_at ||
    (Date.now() - new Date(venture.intelligence_calculated_at).getTime() > 10 * 60 * 1000)

  let vector = venture.intelligence_vector
  let score = venture.intelligence_score

  if (isStale) {
    const { data: computed } = await supabase.rpc('fn_compute_assessment_intelligence', {
      p_venture_id: venture.id,
    })
    if (computed) {
      vector = computed
      score = computed.total
    }
  }

  return NextResponse.json({
    score,
    vector,
    calculated_at: venture.intelligence_calculated_at,
    is_stale: isStale,
  })
}

/**
 * POST /api/ventures/[slug]/assessment/intelligence
 * Force recompute.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (venture.user_id !== user.id && venture.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: computed, error } = await supabase.rpc('fn_compute_assessment_intelligence', {
    p_venture_id: venture.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    score: computed?.total,
    vector: computed,
    calculated_at: new Date().toISOString(),
  })
}