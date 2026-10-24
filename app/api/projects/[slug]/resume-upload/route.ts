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

    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Resume too large (max 10MB)' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const originalName = (file.name || 'resume').replace(/[^a-z0-9.]/gi, '_').slice(0, 60)
    const filename = 'applications/' + project.id + '/' + user.id + '/' + Date.now() + '-' + originalName

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(filename, buffer, {
        contentType: file.type || 'application/pdf',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: pub } = supabase.storage.from('project-attachments').getPublicUrl(filename)

    return NextResponse.json({
      success: true,
      url: pub.publicUrl,
      name: file.name,
      size: file.size,
    })
  } catch (error: any) {
    console.error('Resume upload error:', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
