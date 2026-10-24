import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id, user_id, founder_id').eq('slug', slug).single()
  if (!venture) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check permissions
  const isOwner = venture.user_id === user.id || venture.founder_id === user.id
  if (!isOwner) {
    const perm = await supabase.from('venture_member_permissions')
      .select('can_view_applicants').eq('venture_id', venture.id).eq('user_id', user.id).maybeSingle()
    if (!perm.data?.can_view_applicants) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data } = await supabase.from('venture_role_applications')
    .select('*, users(id, full_name, username, avatar_url, tagline, brings, seeking), venture_looking_for(id, title, type)')
    .eq('venture_id', venture.id)
    .order('created_at', { ascending: false })

  // Count pending
  const pending = (data || []).filter(a => a.status === 'pending').length

  return NextResponse.json({ applications: data || [], pendingCount: pending })
}

export async function PATCH(req: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: venture } = await supabase.from('ventures').select('id').eq('slug', slug).or(`user_id.eq.${user.id},founder_id.eq.${user.id}`).single()
  if (!venture) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const patch: any = {}
  if ('status' in body) patch.status = body.status
  if ('reviewer_notes' in body) patch.reviewer_notes = body.reviewer_notes
  patch.reviewed_by = user.id
  patch.reviewed_at = new Date().toISOString()
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('venture_role_applications')
    .update(patch).eq('id', id).eq('venture_id', venture.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}