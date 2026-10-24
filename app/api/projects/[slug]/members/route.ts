import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
      .select('id, founder_id, user_id, name')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Only project owner can add members' }, { status: 403 })
    }

    if (body.email) {
      const email = String(body.email).toLowerCase().trim()
      const { data: invite, error } = await supabase
        .from('project_invitations')
        .insert({
          project_id: project.id,
          invited_email: email,
          role: body.role || 'member',
          invited_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      return NextResponse.json({ success: true, invitation: invite })
    }

    const target_user_id = body.user_id
    if (!target_user_id) {
      return NextResponse.json({ error: 'user_id or email required' }, { status: 400 })
    }

    const { data: existing } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', project.id)
      .eq('user_id', target_user_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'User already a member' }, { status: 409 })
    }

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: target_user_id,
        role: body.role || 'member',
      })
      .select('*, user:users!project_members_user_id_fkey(id, full_name, username, avatar_url, is_verified)')
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, member: data })
  } catch (error: any) {
    console.error('Add member error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('id')
  if (!memberId) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Only project owner can remove members' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', project.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { member_id, role } = body
    if (!member_id || !role) {
      return NextResponse.json({ error: 'member_id and role required' }, { status: 400 })
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

    const { error } = await supabase
      .from('project_members')
      .update({ role: String(role).slice(0, 40) })
      .eq('id', member_id)
      .eq('project_id', project.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
