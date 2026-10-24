import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - All roles (canonical + venture custom) with their permissions
export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  try {
    const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
    if (!venture) return NextResponse.json({ error: 'Venture not found' }, { status: 404 })

    const { data: roles } = await supabase
      .from('venture_roles')
      .select('*')
      .or(`venture_id.is.null,venture_id.eq.${venture.id}`)
      .order('is_system', { ascending: false })
      .order('display_order', { ascending: true })

    const { data: permissions } = await supabase
      .from('venture_permissions')
      .select('*')
      .order('category', { ascending: true })

    const roleIds = (roles || []).map(r => r.id)
    const { data: rolePerms } = await supabase
      .from('venture_role_permissions')
      .select('role_id, permission_id')
      .in('role_id', roleIds)

    const permMap: Record<string, string[]> = {}
    ;(rolePerms || []).forEach((rp: any) => {
      if (!permMap[rp.role_id]) permMap[rp.role_id] = []
      permMap[rp.role_id].push(rp.permission_id)
    })

    return NextResponse.json({
      roles: roles || [],
      permissions: permissions || [],
      role_permissions: permMap
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST - Create custom venture role
export async function POST(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
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
    const { name, description, permissions = [] } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    const slug_id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36)

    // Insert role
    const { data: role, error } = await supabase
      .from('venture_roles')
      .insert({
        venture_id: venture.id,
        name: name.trim(),
        slug: slug_id,
        description: description?.trim() || null,
        is_custom: true,
        is_system: false
      })
      .select()
      .single()

    if (error) {
      console.error('Insert role error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Insert permissions
    if (permissions.length > 0) {
      const permInserts = permissions.map((p: string) => ({
        role_id: role.id,
        permission_id: p
      }))
      await supabase.from('venture_role_permissions').insert(permInserts)
    }

    // Log activity
    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: venture.id,
        actor_id: user.id,
        action: 'role.created',
        target_type: 'role',
        target_id: role.id,
        new_state: { ...role, permissions }
      })
    } catch {}

    return NextResponse.json({ success: true, role })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}