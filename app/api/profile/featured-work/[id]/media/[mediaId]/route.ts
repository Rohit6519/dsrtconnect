import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/profile/featured-work/[id]/media/[mediaId]
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; mediaId: string } },
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership via work
  const { data: media } = await supabase
    .from('featured_work_media')
    .select('featured_work_id')
    .eq('id', params.mediaId)
    .single()

  if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: work } = await supabase
    .from('featured_work')
    .select('user_id')
    .eq('id', media.featured_work_id)
    .single()

  if (!work || work.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('featured_work_media')
    .delete()
    .eq('id', params.mediaId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}