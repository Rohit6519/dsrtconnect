import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      const { data: member } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const originalName = file.name || 'file'
    const ext = (originalName.split('.').pop() || 'bin').toLowerCase()
    const safeBase = originalName.replace(/[^a-z0-9]/gi, '_').slice(0, 50)
    const filename = 'projects/' + project.id + '/attachments/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '-' + safeBase

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(filename, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: pub } = supabase.storage.from('project-attachments').getPublicUrl(filename)

    return NextResponse.json({
      success: true,
      url: pub.publicUrl,
      name: originalName,
      size: file.size,
      type: file.type,
      extension: ext,
    })
  } catch (error: any) {
    console.error('Attachment upload error:', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
