import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const type = (formData.get('type') as string) || 'avatar' // 'avatar' | 'banner'

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/${type}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)

  const column = type === 'banner' ? 'banner_url' : 'avatar_url'
  await supabase.from('users').update({ [column]: publicUrl, updated_at: new Date().toISOString() }).eq('id', user.id)

  return NextResponse.json({ url: publicUrl })
}