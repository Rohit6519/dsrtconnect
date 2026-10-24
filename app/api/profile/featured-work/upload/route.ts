import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Type detection from MIME
function detectMediaType(mimeType: string, filename: string): 'image' | 'video' | 'pdf' | 'attachment' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) return 'pdf'
  return 'attachment'
}

const LIMITS: Record<string, number> = {
  image:      10 * 1024 * 1024,
  video:      50 * 1024 * 1024,
  pdf:        25 * 1024 * 1024,
  attachment: 25 * 1024 * 1024,
}

/**
 * POST /api/profile/featured-work/upload
 * FormData: { file: File }
 * Returns: { url, media_type, filename, file_size }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const mediaType = detectMediaType(file.type || '', file.name || '')
  const maxSize = LIMITS[mediaType]
  if (file.size > maxSize) {
    return NextResponse.json({
      error: `${mediaType} too large — max ${Math.round(maxSize / (1024*1024))}MB`,
    }, { status: 400 })
  }

  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const safeExt = ext || 'bin'
  const filename = file.name || `file.${safeExt}`
  const storagePath = `featured-work/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const { error: uploadErr } = await supabase.storage
    .from('featured')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
      cacheControl: '3600',
    })

  if (uploadErr) {
    console.error('Featured work upload error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: publicData } = supabase.storage.from('featured').getPublicUrl(storagePath)

  return NextResponse.json({
    url: publicData.publicUrl,
    media_type: mediaType,
    filename,
    file_size: file.size,
  })
}