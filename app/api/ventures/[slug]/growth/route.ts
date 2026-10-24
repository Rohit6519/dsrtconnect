import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ metrics: [] })

  const { data } = await supabase.from('venture_metrics')
    .select('*, venture_metric_entries(id, value, date, note)')
    .eq('venture_id', venture.id)
    .order('position')

  return NextResponse.json({ metrics: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  const insertRow: any = {
    venture_id: venture.id,
    name: body.name,
    slug: body.slug,
    type: body.type || 'number',
    currency: body.currency || null,
    frequency: body.frequency || 'monthly',
    unit: body.unit || null,
    is_public: body.is_public !== false,
    show_on_overview: body.show_on_overview !== false,
    position: body.position || 0,
  }
  if ('is_custom' in body) insertRow.is_custom = body.is_custom
  if ('category' in body) insertRow.category = body.category
  if ('target' in body) insertRow.target = body.target
  if ('higher_is_better' in body) insertRow.higher_is_better = body.higher_is_better
  if ('source' in body) insertRow.source = body.source

  const { data, error } = await supabase.from('venture_metrics')
    .insert(insertRow)
    .select('*, venture_metric_entries(id, value, date, note)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metric: data })
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const metricId = searchParams.get('metricId')
  if (!metricId) return NextResponse.json({ error: 'Missing metricId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['name', 'type', 'unit', 'frequency', 'currency', 'is_public', 'show_on_overview', 'position', 'description', 'target', 'higher_is_better', 'category', 'source']
  const patch: any = {}
  for (const k of allowed) { if (k in body) patch[k] = body[k] }

  const { data, error } = await supabase.from('venture_metrics')
    .update(patch)
    .eq('id', metricId)
    .eq('venture_id', venture.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metric: data })
}

export async function DELETE(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const metricId = searchParams.get('metricId')
  if (!metricId) return NextResponse.json({ error: 'Missing metricId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('venture_metric_entries').delete().eq('metric_id', metricId)
  const { error } = await supabase.from('venture_metrics').delete().eq('id', metricId).eq('venture_id', venture.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}