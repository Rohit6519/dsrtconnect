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

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const kind = searchParams.get('kind') || null

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let query = supabase
      .from('project_knowledge_items')
      .select(`
        id, kind, title, content, url, metadata,
        created_by, created_at, updated_at,
        creator:users!project_knowledge_items_created_by_fkey(id, full_name, username, avatar_url)
      `)
      .eq('project_id', project.id)
      .order('updated_at', { ascending: false })

    if (kind) query = query.eq('kind', kind)

    const { data, error } = await query
    if (error) throw error

    const byKind: Record<string, any[]> = {}
    for (const item of (data || [])) {
      const k = item.kind || 'note'
      if (!byKind[k]) byKind[k] = []
      byKind[k].push(item)
    }

    return NextResponse.json({
      items: data || [],
      by_kind: byKind,
      counts: {
        documentation: (byKind.documentation || []).length,
        research: (byKind.research || []).length,
        reference: (byKind.reference || []).length,
        note: (byKind.note || []).length,
        experiment: (byKind.experiment || []).length,
        decision: (byKind.decision || []).length,
      },
    })
  } catch (e: any) {
    console.error('[projects/[slug]/knowledge GET] error:', e)
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
    const validKinds = ['documentation', 'research', 'reference', 'note', 'experiment', 'decision']
    const kind = validKinds.includes(body.kind) ? body.kind : 'note'

    const { data, error } = await supabase
      .from('project_knowledge_items')
      .insert({
        project_id: project.id,
        kind,
        title: String(body.title || 'Untitled').slice(0, 300),
        content: body.content || null,
        url: body.url || null,
        metadata: body.metadata || {},
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, item: data })
  } catch (e: any) {
    console.error('[projects/[slug]/knowledge POST] error:', e)
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
    if ('title' in patch) allowed.title = String(patch.title).slice(0, 300)
    if ('content' in patch) allowed.content = patch.content
    if ('url' in patch) allowed.url = patch.url
    if ('metadata' in patch) allowed.metadata = patch.metadata
    if ('kind' in patch) {
      const validKinds = ['documentation', 'research', 'reference', 'note', 'experiment', 'decision']
      if (validKinds.includes(patch.kind)) allowed.kind = patch.kind
    }
    allowed.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('project_knowledge_items')
      .update(allowed)
      .eq('id', id)
      .eq('project_id', project.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, item: data })
  } catch (e: any) {
    console.error('[projects/[slug]/knowledge PATCH] error:', e)
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
      .from('project_knowledge_items')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[projects/[slug]/knowledge DELETE] error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}