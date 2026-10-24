import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const kind = (formData.get('kind') as string) || 'cover'

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    const validKinds = ['logo', 'cover', 'gallery', 'update']
    if (!validKinds.includes(kind)) {
      return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const filename = 'projects/' + project.id + '/' + kind + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filename, buffer, {
        contentType: file.type || 'image/png',
        upsert: false,
      })

    if (uploadError) {
      const { error: fbErr } = await supabase.storage
        .from('public')
        .upload(filename, buffer, {
          contentType: file.type || 'image/png',
          upsert: false,
        })
      if (fbErr) throw uploadError

      const { data: pub } = supabase.storage.from('public').getPublicUrl(filename)
      return NextResponse.json({ success: true, url: pub.publicUrl })
    }

    const { data: pub } = supabase.storage.from('media').getPublicUrl(filename)
    return NextResponse.json({ success: true, url: pub.publicUrl })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
