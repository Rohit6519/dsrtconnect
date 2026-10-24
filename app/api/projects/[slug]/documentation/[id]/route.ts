import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (typeof body.title === 'string') patch.title = body.title.slice(0, 200)
    if (typeof body.content === 'string') patch.content = body.content.slice(0, 100000)
    if (typeof body.position === 'number') patch.position = body.position
    if (typeof body.is_published === 'boolean') patch.is_published = body.is_published

    const { data, error } = await supabase
      .from('project_documentation')
      .update(patch)
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, section: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_documentation')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
