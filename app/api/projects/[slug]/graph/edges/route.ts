import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_RELS = ['leads','ownership','collaboration','reports_to','depends_on','mentors','uses','custom','works_with']

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
    if (!body.source_node_id || !body.target_node_id) {
      return NextResponse.json({ error: 'source and target required' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rel = VALID_RELS.includes(body.relationship_type) ? body.relationship_type : 'works_with'

    const { data, error } = await supabase
      .from('project_graph_edges')
      .insert({
        project_id: project.id,
        source_node_id: body.source_node_id,
        target_node_id: body.target_node_id,
        relationship_type: rel,
        label: body.label ? String(body.label).slice(0, 100) : null,
        animated: !!body.animated,
        style_data: body.style_data || {},
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Edge already exists' }, { status: 409 })
      }
      throw error
    }
    return NextResponse.json({ success: true, edge: data })
  } catch (e: any) {
    console.error('Edge create error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
