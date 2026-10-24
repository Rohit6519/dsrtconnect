import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id, name').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: m } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!m || !['owner', 'admin', 'moderator'].includes(m.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { emails, message } = body
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: 'No emails provided' }, { status: 400 })
  }

  const invites = emails.map((email: string) => ({
    organization_id: org.id,
    invited_email: email.trim().toLowerCase(),
    message: message || null,
    invited_by: user.id,
  }))

  const { data, error } = await supabase.from('organization_invitations').insert(invites).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invitations: data, count: data?.length || 0 })
}