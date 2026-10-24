import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; mediaId: string }> }
) {
  const { id, mediaId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: opp } = await supabase
      .from('opportunities')
      .select('poster_user_id')
      .eq('id', id)
      .single()

    if (!opp || opp.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: media } = await supabase
      .from('opportunity_media')
      .select('url')
      .eq('id', mediaId)
      .eq('opportunity_id', id)
      .single()

    if (!media) return NextResponse.json({ error: 'Media not found' }, { status: 404 })

    const { error: dbError } = await supabase
      .from('opportunity_media')
      .delete()
      .eq('id', mediaId)
      .eq('opportunity_id', id)

    if (dbError) throw dbError

    try {
      const urlParts = String(media.url).split('/opportunity-media/')
      if (urlParts.length === 2) {
        await supabase.storage.from('opportunity-media').remove([urlParts[1]])
      }
    } catch (e) {
      console.error('Storage deletion failed (DB already cleaned):', e)
    }

    await writeOpportunityAudit({
      opportunity_id: id,
      actor_id: user.id,
      action: 'media_removed',
      target_type: 'media',
      target_id: mediaId,
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Media delete error:', e)
    return NextResponse.json({ error: e?.message || 'Delete failed' }, { status: 500 })
  }
}