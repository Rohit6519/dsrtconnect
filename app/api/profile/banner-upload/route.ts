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
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Max 8MB' }, { status: 400 })

  const ext = 'jpg' // cropper always outputs JPEG
  const path = `${user.id}/banner-${Date.now()}.${ext}`

  // Upload to `covers` bucket
  const { error: uploadErr } = await supabase.storage
    .from('covers')
    .upload(path, file, {
      contentType: 'image/jpeg',
      upsert: false,
      cacheControl: '3600',
    })

  if (uploadErr) {
    console.error('Banner upload error:', uploadErr)
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: publicData } = supabase.storage.from('covers').getPublicUrl(path)
  const url = publicData.publicUrl

  // Update users.cover_url
  const { error: updateErr } = await supabase
    .from('users')
    .update({ cover_url: url, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ url, path })
}