import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PUT — upsert permission for a specific user
export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string; uid: string }> }
) {
  const { slug, uid } = await context.params
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

    const upsert: Record<string, any> = {
      project_id: project.id,
      user_id: uid,
      granted_by: user.id,
    }
    const flags = ['can_view_applicants','can_review_applicants','can_edit_graph','can_post_updates','can_manage_members','can_manage_roles']
    for (const f of flags) {
      if (f in body) upsert[f] = !!body[f]
    }

    const { data, error } = await supabase
      .from('project_permissions')
      .upsert(upsert, { onConflict: 'project_id,user_id' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, permission: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; uid: string }> }
) {
  const { slug, uid } = await context.params
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
      .from('project_permissions')
      .delete()
      .eq('project_id', project.id)
      .eq('user_id', uid)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
