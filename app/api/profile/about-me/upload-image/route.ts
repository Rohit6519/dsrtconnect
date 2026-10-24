import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/profile/about-me/upload-image
 * FormData: { file: File }
 * Returns: { url: string }
 */
export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files allowed' }, { status: 400 })
  }
  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: 'Max 6MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const safeExt = ['jpg','jpeg','png','webp','gif'].includes(ext) ? ext : 'jpg'
  const path = `about-me/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`

  const { error: uploadErr } = await supabase.storage
    .from('featured')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: '3600',
    })

  if (uploadErr) {
    console.error('About Me image upload error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: publicData } = supabase.storage.from('featured').getPublicUrl(path)
  return NextResponse.json({ url: publicData.publicUrl })
}