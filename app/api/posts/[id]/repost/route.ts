import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const { publisher_type = 'person', publisher_id, quote_content } = body
  const pid = publisher_id || user.id

  const { data: canPub } = await supabase.rpc('fn_can_publish_as', { p_user_id: user.id, p_publisher_type: publisher_type, p_publisher_id: pid })
  if (!canPub) return NextResponse.json({ error: 'Not permitted' }, { status: 403 })

  try {
    let newPost: any = null
    if (quote_content?.trim()) {
      const ins: any = { user_id: user.id, publisher_type, publisher_id: pid, type: 'update', content: quote_content.trim(), content_text: quote_content.trim(), quote_of_id: id, visibility: 'global', is_draft: false, is_published_at: new Date().toISOString() }
      if (publisher_type === 'venture') ins.venture_id = pid
      const { data, error } = await supabase.from('posts').insert(ins).select().single()
      if (error) throw error
      newPost = data
    }

    const { data: existing } = await supabase.from('post_reposts').select('id').eq('original_post_id', id).eq('publisher_type', publisher_type).eq('publisher_id', pid).maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already reposted', post: newPost }, { status: 409 })

    const { data: repost, error: rErr } = await supabase.from('post_reposts').insert({ original_post_id: id, reposter_user_id: user.id, publisher_type, publisher_id: pid, repost_post_id: newPost?.id || null }).select().single()
    if (rErr) throw rErr
    return NextResponse.json({ repost, quote_post: newPost }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const pt = searchParams.get('publisher_type') || 'person'
  const pi = searchParams.get('publisher_id') || user.id
  const { data: rp } = await supabase.from('post_reposts').select('id, repost_post_id').eq('original_post_id', id).eq('publisher_type', pt).eq('publisher_id', pi).eq('reposter_user_id', user.id).maybeSingle()
  if (!rp) return NextResponse.json({ success: true })
  if (rp.repost_post_id) { await supabase.from('posts').delete().eq('id', rp.repost_post_id).eq('user_id', user.id).then(() => {}, () => {}) }
  await supabase.from('post_reposts').delete().eq('id', rp.id)
  return NextResponse.json({ success: true })
}