import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['member','open_role','component','cluster','note']

export async function POST(
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

    const node_type = VALID_TYPES.includes(body.node_type) ? body.node_type : 'component'

    const insert: Record<string, any> = {
      project_id: project.id,
      node_type,
      label: (body.label || 'Untitled').slice(0, 200),
      subtitle: body.subtitle ? String(body.subtitle).slice(0, 200) : null,
      position_x: body.position_x ?? 400,
      position_y: body.position_y ?? 300,
      color: body.color || 'purple',
      icon: body.icon || null,
      style_data: body.style_data || {},
      metadata: body.metadata || {},
    }

    if (body.member_id) insert.member_id = body.member_id
    if (body.role_id) insert.role_id = body.role_id
    if (body.component_type) insert.component_type = body.component_type

    const { data, error } = await supabase
      .from('project_graph_nodes')
      .insert(insert)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, node: data })
  } catch (e: any) {
    console.error('Node create error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
