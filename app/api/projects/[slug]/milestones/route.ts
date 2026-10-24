import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getProject(supabase: any, slug: string) {
  const { data } = await supabase
    .from('projects')
    .select('id, founder_id, user_id')
    .eq('slug', slug)
    .single()
  return data
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', project.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error

    const items = data || []
    const stats = {
      total: items.length,
      completed: items.filter(m => m.status === 'completed').length,
      in_progress: items.filter(m => m.status === 'in_progress').length,
      planned: items.filter(m => m.status === 'planned').length,
    }

    return NextResponse.json({ milestones: items, stats })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const validStatuses = ['planned', 'in_progress', 'completed', 'cancelled']

    const { data, error } = await supabase
      .from('project_milestones')
      .insert({
        project_id: project.id,
        title: String(body.title || 'Untitled milestone').slice(0, 200),
        description: body.description || null,
        status: validStatuses.includes(body.status) ? body.status : 'planned',
        target_date: body.target_date || null,
        sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, milestone: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { id, ...patch } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const allowed: Record<string, any> = {}
    if ('title' in patch) allowed.title = String(patch.title).slice(0, 200)
    if ('description' in patch) allowed.description = patch.description
    if ('status' in patch) {
      const valid = ['planned', 'in_progress', 'completed', 'cancelled']
      if (valid.includes(patch.status)) {
        allowed.status = patch.status
        if (patch.status === 'completed') allowed.completed_at = new Date().toISOString()
        if (patch.status !== 'completed') allowed.completed_at = null
      }
    }
    if ('target_date' in patch) allowed.target_date = patch.target_date
    if ('sort_order' in patch) allowed.sort_order = patch.sort_order
    allowed.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('project_milestones')
      .update(allowed)
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, milestone: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    await supabase
      .from('project_milestones')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}