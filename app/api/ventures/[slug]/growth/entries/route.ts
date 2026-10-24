import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.metric_id || body.value === undefined || !body.date) {
    return NextResponse.json({ error: 'metric_id, value, and date are required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('venture_metric_entries').insert({
    metric_id: body.metric_id,
    venture_id: venture.id,
    value: body.value,
    date: body.date,
    note: body.note || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const allowed = ['value', 'date', 'note']
  const patch: any = {}
  for (const k of allowed) { if (k in body) patch[k] = body[k] }

  const { data, error } = await supabase.from('venture_metric_entries')
    .update(patch)
    .eq('id', id)
    .eq('venture_id', venture.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ entry: data })
}

export async function DELETE(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('venture_metric_entries').delete().eq('id', id).eq('venture_id', venture.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}