import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function verifyOwnership(supabase: any, slug: string, userId: string) {
  const { data } = await supabase.from('ventures').select('id, user_id, founder_id').eq('slug', slug).maybeSingle()
  if (!data || (data.user_id !== userId && data.founder_id !== userId)) return null
  return data
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venture = await verifyOwnership(supabase, slug, user.id)
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const allowed = ['assumption_text', 'confidence', 'belief_rationale', 'test_plan', 'status', 'position']
  const patch: Record<string, any> = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]
  if (body.status === 'validated' || body.status === 'invalidated') {
    patch.validated_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('venture_assumptions')
    .update(patch)
    .eq('id', id)
    .eq('venture_id', venture.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ assumption: data })
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venture = await verifyOwnership(supabase, slug, user.id)
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('venture_assumptions').delete().eq('id', id).eq('venture_id', venture.id)
  return NextResponse.json({ success: true })
}