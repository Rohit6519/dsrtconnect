import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('team_up_media')
    .select('*')
    .eq('draft_id', requestId)
    .eq('user_id', user.id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ media: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    type, url, thumbnail_url, caption, caption_html, description,
    file_size, mime_type, duration_ms, file_name, file_extension,
  } = body
  if (!type || !url) return NextResponse.json({ error: 'type and url required' }, { status: 400 })

  const { data: draft } = await supabase.from('team_up_drafts')
    .select('user_id').eq('id', requestId).single()
  if (!draft || draft.user_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: existing } = await supabase.from('team_up_media')
    .select('position').eq('draft_id', requestId).order('position', { ascending: false }).limit(1)
  const nextPos = (existing?.[0]?.position ?? -1) + 1

  const { data, error } = await supabase.from('team_up_media').insert({
    draft_id: requestId,
    user_id: user.id,
    type, url, thumbnail_url,
    caption, caption_html, description,
    file_size, mime_type, duration_ms,
    file_name, file_extension,
    position: nextPos,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ media: data }, { status: 201 })
}
