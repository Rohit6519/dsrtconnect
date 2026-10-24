import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ members: [] })
  const { data } = await supabase.from('venture_team_members')
    .select('*, users(id, full_name, username, avatar_url)')
    .eq('venture_id', venture.id)
    .order('position')
  return NextResponse.json({ members: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id, name').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()

  if (body.user_id) {
    // Direct add as pending member
    const { data: userProfile } = await supabase.from('users').select('full_name, avatar_url').eq('id', body.user_id).single()

    const { data, error } = await supabase.from('venture_team_members').insert({
      venture_id: venture.id,
      user_id: body.user_id,
      name: userProfile?.full_name || 'Member',
      avatar_url: userProfile?.avatar_url,
      role: body.role || 'Team Member',
      status: 'pending',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Create notification
    await supabase.from('notifications').insert({
      user_id: body.user_id,
      type: 'venture_invitation',
      from_user_id: user.id,
      entity_type: 'venture',
      entity_id: venture.id,
      title: 'Invitation to join ' + venture.name,
      message: 'You have been invited to join a venture team',
      action_url: '/ventures/' + slug,
    }).then(() => {}, () => {})

    return NextResponse.json({ member: data, method: 'direct' })
  }

  if (body.email) {
    // Email invite (store as record without user_id)
    const { data, error } = await supabase.from('venture_team_members').insert({
      venture_id: venture.id,
      name: body.email,
      role: body.role || 'Team Member',
      status: 'pending',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // TODO: Actually send email via your email service (Resend, SendGrid, etc.)
    return NextResponse.json({ member: data, method: 'email' })
  }

  return NextResponse.json({ error: 'Provide user_id or email' }, { status: 400 })
}