import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_IMAGE = 12 * 1024 * 1024
const MAX_VIDEO = 100 * 1024 * 1024
const MAX_FILE  = 25 * 1024 * 1024

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']
const FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/rtf',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
]

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const isImage = IMAGE_TYPES.includes(file.type)
  const isVideo = VIDEO_TYPES.includes(file.type)
  const isFile  = FILE_TYPES.includes(file.type)
  if (!isImage && !isVideo && !isFile) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
  }
  if (isImage && file.size > MAX_IMAGE) return NextResponse.json({ error: 'Image too large (max 12MB)' }, { status: 400 })
  if (isVideo && file.size > MAX_VIDEO) return NextResponse.json({ error: 'Video too large (max 100MB)' }, { status: 400 })
  if (isFile  && file.size > MAX_FILE)  return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })

  const type: 'image' | 'video' | 'file' = isImage ? 'image' : isVideo ? 'video' : 'file'
  const ext = (file.name.split('.').pop() || (isImage ? 'jpg' : isVideo ? 'mp4' : 'bin')).toLowerCase()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  const path = `${user.id}/${type}s/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`

  const buf = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('team-up-media')
    .upload(path, buf, { contentType: file.type, upsert: false })

  if (uploadError) {
    const { error: fallback } = await supabase.storage
      .from('community')
      .upload(`team-up-media/${path}`, buf, { contentType: file.type, upsert: false })
    if (fallback) return NextResponse.json({ error: fallback.message }, { status: 500 })
    const { data: pub } = supabase.storage.from('community').getPublicUrl(`team-up-media/${path}`)
    return NextResponse.json({
      url: pub.publicUrl, type, size: file.size, mime_type: file.type,
      file_name: file.name, file_extension: ext,
    })
  }

  const { data: pub } = supabase.storage.from('team-up-media').getPublicUrl(path)
  return NextResponse.json({
    url: pub.publicUrl, type, size: file.size, mime_type: file.type,
    file_name: file.name, file_extension: ext,
  })
}
