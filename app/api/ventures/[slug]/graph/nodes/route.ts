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
  const { data, error } = await supabase.from('venture_graph_nodes').insert({
    venture_id: venture.id,
    node_type: body.node_type || 'member',
    member_id: body.member_id || null,
    role_id: body.role_id || null,
    group_label: body.group_label || null,
    group_color: body.group_color || 'zinc',
    label: body.label || 'New Node',
    subtitle: body.subtitle || null,
    position_x: body.position_x || 0,
    position_y: body.position_y || 0,
    width: body.width || null,
    height: body.height || null,
    color: body.color || 'white',
    style_data: body.style_data || {},
    metadata: body.metadata || {},
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ node: data })
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
  const allowed = ['label', 'subtitle', 'position_x', 'position_y', 'width', 'height', 'color', 'style_data', 'metadata', 'group_label', 'group_color', 'node_type']
  const patch: any = { updated_at: new Date().toISOString() }
  for (const k of allowed) { if (k in body) patch[k] = body[k] }

  const { data, error } = await supabase.from('venture_graph_nodes')
    .update(patch).eq('id', id).eq('venture_id', venture.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ node: data })
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

  // Delete connected edges first
  await supabase.from('venture_graph_edges').delete().or(`source_node_id.eq.${id},target_node_id.eq.${id}`)
  const { error } = await supabase.from('venture_graph_nodes').delete().eq('id', id).eq('venture_id', venture.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}