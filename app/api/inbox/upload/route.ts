import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'text/plain', 'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'bin'
    const fileName = user.id + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext

    const buf = Buffer.from(await file.arrayBuffer())
    const { data, error } = await supabase.storage
      .from('inbox-attachments')
      .upload(fileName, buf, {
        contentType: file.type,
        upsert: false,
      })

    if (error) throw error

    const { data: pub } = supabase.storage
      .from('inbox-attachments')
      .getPublicUrl(data.path)

    return NextResponse.json({
      url: pub.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    })
  } catch (e: any) {
    console.error('Attachment upload error:', e)
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}