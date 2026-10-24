import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Increment view count
    await supabase.from('project_roles').update({ view_count: (data.view_count || 0) + 1 }).eq('id', id).then(() => {}, () => {})

    return NextResponse.json({ role: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function PATCH(
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

    const allowed = ['title','description','responsibilities','key_skills','deliverables','employment_type','location_type','compensation_type','compensation_details','min_commitment_hours','positions_open','custom_questions','status','icon','color','closes_at']
    const patch: Record<string, any> = {}
    for (const k of allowed) {
      if (k in body) patch[k] = body[k]
    }
    if ('key_skills' in body) patch.skills_needed = body.key_skills

    const { data, error } = await supabase
      .from('project_roles')
      .update(patch)
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, role: data })
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
      .from('project_roles')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
