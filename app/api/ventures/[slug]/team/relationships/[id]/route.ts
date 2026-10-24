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

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const { relationship_type } = body

    if (!relationship_type) {
      return NextResponse.json({ error: 'relationship_type is required' }, { status: 400 })
    }

    const { data: rel, error } = await supabase
      .from('venture_team_relationships')
      .update({ relationship_type })
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    // Log activity
    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'relationship.updated',
        target_type: 'relationship',
        target_id: id,
        metadata: { relationship_type }
      })
    } catch {}

    return NextResponse.json({ success: true, relationship: rel })
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

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { error } = await supabase
      .from('venture_team_relationships')
      .delete()
      .eq('id', id)
      .eq('venture_id', venture.id)

    if (error) throw error

    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'relationship.deleted',
        target_type: 'relationship',
        target_id: id
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}