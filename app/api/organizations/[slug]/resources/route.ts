import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ resources: [] })

  const { data } = await supabase
    .from('organization_resources')
    .select(`
      id, title, description, type, url, file_url, thumbnail_url, category, tags,
      like_count, view_count, is_pinned, created_at,
      users:user_id (id, full_name, username, avatar_url)
    `)
    .eq('organization_id', org.id)
    .eq('is_approved', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30)

  return NextResponse.json({ resources: data || [] })
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { title, description, type, url, category, tags } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const { data, error } = await supabase.from('organization_resources').insert({
    organization_id: org.id,
    user_id: user.id,
    title: title.trim(),
    description: description?.trim() || null,
    type: type || 'link',
    url: url?.trim() || null,
    category: category || null,
    tags: Array.isArray(tags) ? tags : [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ resource: data })
}