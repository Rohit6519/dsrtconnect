import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ products: [] })
  const { data } = await supabase.from('venture_products').select('*').eq('venture_id', venture.id).order('position')
  return NextResponse.json({ products: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase.from('venture_products').insert({
    venture_id: venture.id,
    name: body.name || 'New Product',
    tagline: body.tagline || null,
    description: body.description || null,
    status: body.status || 'building',
    type: body.type || 'web',
    url: body.url || null,
    demo_url: body.demo_url || null,
    video_url: body.video_url || null,
    thumbnail_url: body.thumbnail_url || null,
    screenshots: body.screenshots || [],
    tech_stack: body.tech_stack || [],
    user_count: body.user_count || null,
    customer_count: body.customer_count || null,
    is_open_source: body.is_open_source || false,
    is_public: body.is_public !== false,
    position: body.position || 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
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
  const allowed = ['name', 'tagline', 'description', 'status', 'type', 'url', 'demo_url', 'video_url', 'thumbnail_url', 'screenshots', 'tech_stack', 'user_count', 'customer_count', 'is_open_source', 'is_public', 'position']
  const patch: Record<string, any> = {}
  for (const k of allowed) {
    if (k in body) patch[k] = body[k]
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('venture_products')
    .update(patch)
    .eq('id', id)
    .eq('venture_id', venture.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: data })
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

  const { error } = await supabase.from('venture_products').delete().eq('id', id).eq('venture_id', venture.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}