import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET — full graph (nodes + edges); auto-generates if empty
export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Check if graph exists
    const { count } = await supabase
      .from('project_graph_nodes')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)

    // Auto-generate if empty
    if ((count || 0) === 0) {
      await supabase.rpc('auto_generate_project_graph', { p_project_id: project.id })
    }

    const [nodesRes, edgesRes, membersRes, rolesRes] = await Promise.all([
      supabase
        .from('project_graph_nodes')
        .select('*')
        .eq('project_id', project.id),
      supabase
        .from('project_graph_edges')
        .select('*')
        .eq('project_id', project.id),
      supabase
        .from('project_members')
        .select('id, user_id, role, joined_at, user:users!project_members_user_id_fkey(id, full_name, username, avatar_url, is_verified, tagline)')
        .eq('project_id', project.id),
      supabase
        .from('project_roles')
        .select('*')
        .eq('project_id', project.id),
    ])

    return NextResponse.json({
      nodes: nodesRes.data || [],
      edges: edgesRes.data || [],
      members: membersRes.data || [],
      roles: rolesRes.data || [],
    })
  } catch (e: any) {
    console.error('Graph fetch error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// PUT — bulk save all nodes + edges (used when saving from editor)
export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
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

    // Bulk update positions only (not full replace)
    const nodes = Array.isArray(body.nodes) ? body.nodes : []

    for (const n of nodes) {
      if (!n.id) continue
      await supabase
        .from('project_graph_nodes')
        .update({
          position_x: n.position_x,
          position_y: n.position_y,
        })
        .eq('id', n.id)
        .eq('project_id', project.id)
    }

    return NextResponse.json({ success: true, saved: nodes.length })
  } catch (e: any) {
    console.error('Graph save error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
