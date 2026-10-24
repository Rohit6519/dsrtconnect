import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Change role, permissions, or role_title
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
    const { role_id, role_title, permissions, position_id } = body

    // Fetch current state for audit
    const { data: before } = await supabase
      .from('venture_team_memberships')
      .select('*')
      .eq('id', id)
      .eq('venture_id', venture.id)
      .single()

    if (!before) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

    // Build patch
    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (role_id !== undefined) patch.role_id = role_id
    if (role_title !== undefined) patch.role_title = role_title
    if (Array.isArray(permissions)) patch.permissions = permissions
    if (position_id !== undefined) patch.position_id = position_id

    const { data: updated, error } = await supabase
      .from('venture_team_memberships')
      .update(patch)
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
        action: 'membership.role_changed',
        target_type: 'membership',
        target_id: id,
        old_state: {
          role_id: before.role_id,
          role_title: before.role_title,
          permissions: before.permissions
        },
        new_state: {
          role_id: updated.role_id,
          role_title: updated.role_title,
          permissions: updated.permissions
        },
        metadata: { changed_by_owner: true }
      })
    } catch {}

    return NextResponse.json({ success: true, membership: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE - Remove member from venture
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

    // Fetch membership
    const { data: membership } = await supabase
      .from('venture_team_memberships')
      .select('*, user:users(id, full_name)')
      .eq('id', id)
      .eq('venture_id', venture.id)
      .single()

    if (!membership) return NextResponse.json({ error: 'Membership not found' }, { status: 404 })

    // Allow owner-remove OR self-leave
    const { data: isOwner } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    const isSelf = membership.user_id === user.id

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const reason = body.reason?.trim() || null

    // Soft-remove: set status = 'removed' and log
    const { error } = await supabase
      .from('venture_team_memberships')
      .update({
        status: 'removed',
        removed_at: new Date().toISOString(),
        removed_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    // Log activity
    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: isSelf ? 'membership.left' : 'membership.removed',
        target_type: 'membership',
        target_id: id,
        old_state: membership,
        metadata: {
          removed_user_id: membership.user_id,
          removed_user_name: membership.user?.full_name,
          reason,
          self_left: isSelf
        }
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}