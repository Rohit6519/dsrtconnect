import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ nodes: [], edges: [] })

  const [nodes, edges] = await Promise.all([
    supabase.from('venture_graph_nodes').select('*, venture_team_members(*, users(id, full_name, username, avatar_url, tagline)), venture_looking_for(*)').eq('venture_id', venture.id).order('created_at'),
    supabase.from('venture_graph_edges').select('*').eq('venture_id', venture.id).order('created_at'),
  ])

  return NextResponse.json({
    nodes: nodes.data || [],
    edges: edges.data || [],
  })
}