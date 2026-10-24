import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safeExt = ext || 'bin'
  const filename = file.name || `file.${safeExt}`
  const storagePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const { error: uploadErr } = await supabase.storage
    .from('inbox-attachments')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadErr) {
    console.error('Attachment upload error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: publicData } = supabase.storage.from('inbox-attachments').getPublicUrl(storagePath)

  let mediaType = 'attachment'
  if (file.type.startsWith('image/')) mediaType = 'image'
  else if (file.type.startsWith('video/')) mediaType = 'video'
  else if (file.type === 'application/pdf') mediaType = 'pdf'

  return NextResponse.json({
    url: publicData.publicUrl,
    media_type: mediaType,
    filename,
    file_size: file.size,
  })
}