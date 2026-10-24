import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('featured_items')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  return NextResponse.json({ items: data || [] })
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { type, title, description, image_url, video_url, link_url, project_id, venture_id, item_category, is_pinned } = body
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data: existing } = await supabase
    .from('featured_items')
    .select('position')
    .eq('user_id', user.id)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = existing ? (existing.position + 1) : 0

  const { data, error } = await supabase.from('featured_items').insert({
    user_id: user.id,
    type: type || 'showcase',
    title: title.trim(),
    description: description?.trim() || null,
    image_url: image_url || null,
    video_url: video_url || null,
    link_url: link_url || null,
    project_id: project_id || null,
    venture_id: venture_id || null,
    item_category: item_category || 'showcase',
    is_pinned: !!is_pinned,
    position: nextPosition,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await supabase.from('featured_items').delete().eq('id', id).eq('user_id', user.id)
  return NextResponse.json({ success: true })
}