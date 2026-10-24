import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// PATCH - Update custom role
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

    // Verify role is custom + belongs to venture
    const { data: existing } = await supabase
      .from('venture_roles')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    if (existing.is_system) {
      return NextResponse.json({ error: 'Cannot edit system role' }, { status: 403 })
    }
    if (existing.venture_id !== venture.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, permissions } = body

    // Update role
    const patch: Record<string, any> = { updated_at: new Date().toISOString() }
    if (name?.trim()) patch.name = name.trim()
    if (description !== undefined) patch.description = description?.trim() || null

    const { data: role, error } = await supabase
      .from('venture_roles')
      .update(patch)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Sync permissions if provided
    if (Array.isArray(permissions)) {
      // Delete old
      await supabase.from('venture_role_permissions').delete().eq('role_id', id)
      // Insert new
      if (permissions.length > 0) {
        const inserts = permissions.map((p: string) => ({
          role_id: id,
          permission_id: p
        }))
        await supabase.from('venture_role_permissions').insert(inserts)
      }
    }

    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'role.updated',
        target_type: 'role',
        target_id: id,
        old_state: existing,
        new_state: { ...role, permissions }
      })
    } catch {}

    return NextResponse.json({ success: true, role })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE - Delete custom role
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

    const { data: existing } = await supabase
      .from('venture_roles')
      .select('*')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.is_system) {
      return NextResponse.json({ error: 'Cannot delete system role' }, { status: 403 })
    }
    if (existing.venture_id !== venture.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: isMember } = await supabase.rpc('is_venture_owner_or_member', {
      p_venture_id: venture.id,
      p_user_id: user.id
    })
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Check if any memberships use this role
    const { count } = await supabase
      .from('venture_team_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', id)

    if ((count || 0) > 0) {
      return NextResponse.json({
        error: `Cannot delete role. ${count} member(s) currently have this role. Reassign them first.`
      }, { status: 409 })
    }

    await supabase.from('venture_roles').delete().eq('id', id)

    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'role.deleted',
        target_type: 'role',
        target_id: id,
        old_state: existing
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}