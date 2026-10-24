import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(
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

    const { data: updated, error } = await supabase
      .from('venture_team_memberships')
      .update({
        status: 'active',
        suspended_at: null,
        suspended_by: null,
        removed_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('venture_id', venture.id)
      .select()
      .single()

    if (error) throw error

    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'membership.restored',
        target_type: 'membership',
        target_id: id,
        new_state: updated
      })
    } catch {}

    return NextResponse.json({ success: true, membership: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}