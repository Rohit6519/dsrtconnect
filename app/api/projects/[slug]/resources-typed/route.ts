import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getProject(supabase: any, slug: string) {
  const { data } = await supabase
    .from('projects')
    .select('id, founder_id, user_id, is_public, visibility')
    .eq('slug', slug)
    .single()
  return data
}

const VALID_TYPES = ['repository', 'demo', 'documentation', 'paper', 'dataset', 'video', 'design', 'website', 'other']

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data } = await supabase
      .from('project_resources_typed')
      .select('*')
      .eq('project_id', project.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    const byType: Record<string, any[]> = {}
    for (const r of (data || [])) {
      const t = r.type || 'other'
      if (!byType[t]) byType[t] = []
      byType[t].push(r)
    }

    return NextResponse.json({ resources: data || [], by_type: byType })
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
    if (!body.title || !body.url) {
      return NextResponse.json({ error: 'title and url required' }, { status: 400 })
    }

    const type = VALID_TYPES.includes(body.type) ? body.type : 'other'

    const { data, error } = await supabase
      .from('project_resources_typed')
      .insert({
        project_id: project.id,
        title: String(body.title).slice(0, 200),
        type,
        url: String(body.url).slice(0, 500),
        description: body.description || null,
        sort_order: typeof body.sort_order === 'number' ? body.sort_order : 0,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, resource: data })
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
      .from('project_resources_typed')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}