import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  const body = await req.json()
  
  // Whitelist editable fields
  const allowed = ['title', 'description', 'position_type', 'status', 'team_name', 'department', 'capacity', 'linked_opportunity_id']
  const patch: any = {}
  for (const k of allowed) if (k in body) patch[k] = body[k]

  try {
    const { data: before } = await supabase.from('venture_team_positions').select('*').eq('id', id).single()

    const { data: position, error } = await supabase
      .from('venture_team_positions')
      .update(patch)
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    await supabase.rpc('fn_venture_audit', {
      p_venture_id: venture.id, p_action: 'position.updated',
      p_target_type: 'position', p_target_id: position.id,
      p_before: before, p_after: position
    })

    return NextResponse.json({ success: true, position })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

  try {
    // Soft delete by archiving
    const { data: position, error } = await supabase
      .from('venture_team_positions')
      .update({ status: 'archived', archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    await supabase.rpc('fn_venture_audit', {
      p_venture_id: venture.id, p_action: 'position.archived',
      p_target_type: 'position', p_target_id: position.id, p_after: position
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}