import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_ITEMS = 12

/**
 * GET /api/profile/featured-work?user_id=<id>
 * Returns all visible work items with their media, ordered by position
 */
export async function GET(request: Request) {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  const { data: works, error } = await supabase
    .from('featured_work')
    .select('*, media:featured_work_media(*)')
    .eq('user_id', userId)
    .eq('is_visible', true)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sort media within each work by position
  const sorted = (works || []).map((w: any) => ({
    ...w,
    media: Array.isArray(w.media)
      ? [...w.media].sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      : [],
  }))

  return NextResponse.json({ works: sorted })
}

/**
 * POST /api/profile/featured-work
 * Body: { title, description_html, media: [{ url, media_type, filename?, thumbnail_url?, duration_seconds?, file_size? }] }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const title = (body.title || '').trim()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (title.length > 200) return NextResponse.json({ error: 'Title too long (max 200)' }, { status: 400 })

  // Check max
  const { count } = await supabase
    .from('featured_work')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count || 0) >= MAX_ITEMS) {
    return NextResponse.json({ error: `Max ${MAX_ITEMS} featured work items` }, { status: 400 })
  }

  const { data: work, error: workErr } = await supabase
    .from('featured_work')
    .insert({
      user_id: user.id,
      title,
      description_html: (body.description_html || '').trim() || null,
      position: count || 0,
      is_visible: true,
    })
    .select('*')
    .single()

  if (workErr) {
    console.error('Featured work insert error:', workErr)
    return NextResponse.json({ error: workErr.message }, { status: 500 })
  }

  // Insert media if provided
  const mediaInput = Array.isArray(body.media) ? body.media : []
  let media: any[] = []
  if (mediaInput.length > 0) {
    const mediaRows = mediaInput.slice(0, 20).map((m: any, i: number) => ({
      featured_work_id: work.id,
      media_type: ['image','video','pdf','attachment'].includes(m.media_type) ? m.media_type : 'attachment',
      url: (m.url || '').toString(),
      thumbnail_url: m.thumbnail_url || null,
      filename: m.filename || null,
      duration_seconds: typeof m.duration_seconds === 'number' ? Math.round(m.duration_seconds) : null,
      file_size: typeof m.file_size === 'number' ? m.file_size : null,
      position: i,
    })).filter((m: any) => m.url)

    if (mediaRows.length > 0) {
      const { data: insertedMedia, error: mediaErr } = await supabase
        .from('featured_work_media')
        .insert(mediaRows)
        .select('*')

      if (mediaErr) {
        console.error('Media insert error:', mediaErr)
      } else {
        media = (insertedMedia || []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
      }
    }
  }

  return NextResponse.json({ work: { ...work, media } })
}