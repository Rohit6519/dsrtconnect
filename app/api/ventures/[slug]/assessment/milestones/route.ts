import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function verifyOwnership(supabase: any, slug: string, userId: string) {
  const { data } = await supabase.from('ventures').select('id, user_id, founder_id').eq('slug', slug).maybeSingle()
  if (!data || (data.user_id !== userId && data.founder_id !== userId)) return null
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
    .from('venture_milestones')
    .select('*')
    .eq('venture_id', venture.id)
    .order('position')
  return NextResponse.json({ milestones: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const venture = await verifyOwnership(supabase, slug, user.id)
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  if (!body.title || String(body.title).trim().length < 3) {
    return NextResponse.json({ error: 'title required (min 3 chars)' }, { status: 400 })
  }

  const { count } = await supabase
    .from('venture_milestones')
    .select('id', { count: 'exact', head: true })
    .eq('venture_id', venture.id)

  // If this is the first milestone, mark as primary
  const isPrimary = (count || 0) === 0 || !!body.is_primary

  const { data, error } = await supabase
    .from('venture_milestones')
    .insert({
      venture_id: venture.id,
      title: String(body.title).trim().slice(0, 200),
      description: body.description || null,
      target_date: body.target_date || null,
      success_criteria: body.success_criteria || null,
      status: 'active',
      is_primary: isPrimary,
      position: count || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ milestone: data })
}