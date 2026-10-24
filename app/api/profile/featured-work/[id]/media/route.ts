import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_MEDIA_PER_WORK = 20

/**
 * POST /api/profile/featured-work/[id]/media
 * Body: { url, media_type, filename?, thumbnail_url?, duration_seconds?, file_size? }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership of parent work
  const { data: work } = await supabase
    .from('featured_work')
    .select('user_id')
    .eq('id', params.id)
    .single()

  if (!work || work.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await request.json()
  const url = (body.url || '').toString().trim()
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const mediaType = ['image','video','pdf','attachment'].includes(body.media_type)
    ? body.media_type
    : 'attachment'

  // Check media count
  const { count } = await supabase
    .from('featured_work_media')
    .select('id', { count: 'exact', head: true })
    .eq('featured_work_id', params.id)

  if ((count || 0) >= MAX_MEDIA_PER_WORK) {
    return NextResponse.json({ error: `Max ${MAX_MEDIA_PER_WORK} media items per work` }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('featured_work_media')
    .insert({
      featured_work_id: params.id,
      media_type: mediaType,
      url,
      thumbnail_url: body.thumbnail_url || null,
      filename: body.filename || null,
      duration_seconds: typeof body.duration_seconds === 'number' ? Math.round(body.duration_seconds) : null,
      file_size: typeof body.file_size === 'number' ? body.file_size : null,
      position: count || 0,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ media: data })
}