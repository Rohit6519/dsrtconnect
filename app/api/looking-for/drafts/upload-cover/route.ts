import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_SIZE = 8 * 1024 * 1024 // 8MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// POST /api/looking-for/drafts/upload-cover
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('team-up-covers')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    // Fallback to community bucket if team-up-covers doesn't exist
    const { error: fallbackError } = await supabase.storage
      .from('community')
      .upload(`team-up-covers/${path}`, arrayBuffer, { contentType: file.type, upsert: false })
    if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 })

    const { data: pub } = supabase.storage.from('community').getPublicUrl(`team-up-covers/${path}`)
    return NextResponse.json({ url: pub.publicUrl })
  }

  const { data: pub } = supabase.storage.from('team-up-covers').getPublicUrl(path)
  return NextResponse.json({ url: pub.publicUrl })
}
