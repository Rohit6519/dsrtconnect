import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Soft size guard 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'bin'
    const filename = `${id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('opportunity-media')
      .upload(filename, file, { cacheControl: '3600', upsert: false })

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('opportunity-media')
      .getPublicUrl(filename)

    const url = publicUrlData.publicUrl
    const mimeType = file.type || 'application/octet-stream'
    const mediaType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('video/')
        ? 'video'
        : 'document'

    // next position
    const { data: last } = await supabase
      .from('opportunity_media')
      .select('position')
      .eq('opportunity_id', id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPos = last && last.length > 0 ? (last[0].position || 0) + 1 : 0

    const { data: mediaRecord, error: dbError } = await supabase
      .from('opportunity_media')
      .insert({
        opportunity_id: id,
        media_type: mediaType,
        url,
        filename: file.name,
        size_bytes: file.size,
        mime_type: mimeType,
        position: nextPos,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) throw dbError

    await writeOpportunityAudit({
      opportunity_id: id,
      actor_id: user.id,
      action: 'media_added',
      target_type: 'media',
      target_id: mediaRecord.id,
    }).catch(() => {})

    return NextResponse.json({ media: mediaRecord })
  } catch (e: any) {
    console.error('Media upload error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}