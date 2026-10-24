import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File too large (max 25MB)' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
    const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabase.storage
      .from('mail-attachments')
      .upload(fileName, buf, {
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    const { data: pub } = supabase.storage
      .from('mail-attachments')
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: pub.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      path: data.path,
    })
  } catch (e: any) {
    console.error('Upload error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}