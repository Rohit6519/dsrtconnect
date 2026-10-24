import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/profile/featured-work/[id]
 * Body: { title?, description_html?, position? }
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: existing } = await supabase
    .from('featured_work')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const patch: Record<string, any> = {}
  if ('title' in body) {
    const t = (body.title || '').trim()
    if (!t) return NextResponse.json({ error: 'Title required' }, { status: 400 })
    if (t.length > 200) return NextResponse.json({ error: 'Title too long' }, { status: 400 })
    patch.title = t
  }
  if ('description_html' in body) {
    patch.description_html = (body.description_html || '').trim() || null
  }
  if ('position' in body && typeof body.position === 'number') patch.position = body.position
  if ('is_visible' in body) patch.is_visible = !!body.is_visible

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('featured_work')
    .update(patch)
    .eq('id', params.id)
    .select('*, media:featured_work_media(*)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const sortedMedia = Array.isArray(data.media)
    ? [...data.media].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
    : []

  return NextResponse.json({ work: { ...data, media: sortedMedia } })
}

/**
 * DELETE /api/profile/featured-work/[id]
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('featured_work')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!existing || existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('featured_work')
    .delete()
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}