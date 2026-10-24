import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabase.from('venture_member_permissions')
    .select('*, users(id, full_name, username, avatar_url)')
    .eq('venture_id', venture.id)
    .order('granted_at', { ascending: false })

  return NextResponse.json({ permissions: data || [] })
}

export async function POST(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { data, error } = await supabase.from('venture_member_permissions').upsert({
    venture_id: venture.id,
    user_id: body.user_id,
    can_view_applicants: body.can_view_applicants || false,
    can_review_applicants: body.can_review_applicants || false,
    can_edit_graph: body.can_edit_graph || false,
    can_post_updates: body.can_post_updates || false,
    can_manage_members: body.can_manage_members || false,
    can_manage_roles: body.can_manage_roles || false,
    granted_by: user.id,
    granted_at: new Date().toISOString(),
  }, { onConflict: 'venture_id,user_id' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ permission: data })
}