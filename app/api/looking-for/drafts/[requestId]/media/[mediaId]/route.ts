import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; mediaId: string }> }
) {
  const { requestId, mediaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: any = {}
  if (body.caption !== undefined) patch.caption = body.caption
  if (body.caption_html !== undefined) patch.caption_html = body.caption_html
  if (body.description !== undefined) patch.description = body.description
  if (body.position !== undefined) patch.position = body.position

  const { data, error } = await supabase.from('team_up_media')
    .update(patch)
    .eq('id', mediaId)
    .eq('draft_id', requestId)
    .eq('user_id', user.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ media: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string; mediaId: string }> }
) {
  const { requestId, mediaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('team_up_media')
    .delete()
    .eq('id', mediaId)
    .eq('draft_id', requestId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
