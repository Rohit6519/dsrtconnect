import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 })

  // Check user's membership & role
  let membership = null
  if (user) {
    const { data: m } = await supabase
      .from('organization_members')
      .select('role, status, verified, joined_at')
      .eq('organization_id', org.id)
      .eq('user_id', user.id)
      .maybeSingle()
    membership = m
  }

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isModerator = membership?.role === 'moderator'

  return NextResponse.json({
    organization: org,
    membership,
    permissions: {
      is_member: !!membership && membership.status === 'active',
      is_admin: isAdmin,
      is_moderator: isModerator || isAdmin,
      can_edit: isAdmin,
      can_moderate: isAdmin || isModerator,
      can_invite: isAdmin || isModerator,
      can_post_resource: !!membership && membership.status === 'active',
      can_post_discussion: !!membership && membership.status === 'active',
    },
  })
}
export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', params.slug)
    .single()

  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const allowedFields = ['name', 'tagline', 'description', 'logo_url', 'banner_url', 'website', 'location', 'founded_year', 'type', 'category', 'settings']
  const updates: any = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', org.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ organization: data })
}