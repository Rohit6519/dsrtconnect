import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ announcements: [] })

  const { data } = await supabase
    .from('organization_announcements')
    .select('*')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ announcements: data || [] })
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: m } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!m || !['owner', 'admin'].includes(m.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { data, error } = await supabase
    .from('organization_announcements')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      title: body.title,
      content: body.content,
      type: body.type || 'general',
      icon: body.icon || null,
      color: body.color || 'blue',
      link_url: body.link_url || null,
      link_text: body.link_text || null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      is_pinned: !!body.is_pinned,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ announcement: data })
}