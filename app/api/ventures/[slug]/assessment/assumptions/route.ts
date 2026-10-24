import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function verifyOwnership(supabase: any, slug: string, userId: string) {
  const { data } = await supabase
    .from('ventures')
    .select('id, user_id, founder_id')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return null
  if (data.user_id !== userId && data.founder_id !== userId) return null
  return data
}

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venture = await verifyOwnership(supabase, slug, user.id)
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase
    .from('venture_assumptions')
    .select('*')
    .eq('venture_id', venture.id)
    .order('position')
  return NextResponse.json({ assumptions: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venture = await verifyOwnership(supabase, slug, user.id)
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.assumption_text || String(body.assumption_text).trim().length < 5) {
    return NextResponse.json({ error: 'assumption_text required (min 5 chars)' }, { status: 400 })
  }

  const { count } = await supabase
    .from('venture_assumptions')
    .select('id', { count: 'exact', head: true })
    .eq('venture_id', venture.id)

  const { data, error } = await supabase
    .from('venture_assumptions')
    .insert({
      venture_id: venture.id,
      assumption_text: String(body.assumption_text).trim().slice(0, 500),
      confidence: body.confidence || 'medium',
      belief_rationale: body.belief_rationale || null,
      test_plan: body.test_plan || null,
      status: 'active',
      position: count || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assumption: data })
}