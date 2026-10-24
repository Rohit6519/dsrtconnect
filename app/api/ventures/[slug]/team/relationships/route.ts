import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  const body = await req.json()

  if (!body.source_position_id || !body.target_position_id || !body.relationship_type) {
    return NextResponse.json({ error: 'Missing required relationship fields' }, { status: 400 })
  }

  try {
    const { data: rel, error } = await supabase
      .from('venture_team_relationships')
      .insert({
        venture_id: venture.id,
        source_position_id: body.source_position_id,
        target_position_id: body.target_position_id,
        relationship_type: body.relationship_type,
        created_by: user.id
      })
      .select()
      .single()

    if (error) throw error

    await supabase.rpc('fn_venture_audit', {
      p_venture_id: venture.id, p_action: 'relationship.created',
      p_target_type: 'relationship', p_target_id: rel.id, p_after: rel
    })

    return NextResponse.json({ success: true, relationship: rel })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}