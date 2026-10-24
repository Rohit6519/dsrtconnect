import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ discussions: [] })

  const { data } = await supabase
    .from('organization_discussions')
    .select(`
      id, title, content, category, tags, like_count, comment_count, view_count, is_pinned, created_at,
      users:user_id (id, full_name, username, avatar_url)
    `)
    .eq('organization_id', org.id)
    .order('is_pinned', { ascending: false })
    .order('last_activity_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ discussions: data || [] })
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const { title, content, category, tags } = body

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'Title and content required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('organization_discussions').insert({
    organization_id: org.id,
    user_id: user.id,
    title: title.trim(),
    content: content.trim(),
    category: category || 'general',
    tags: Array.isArray(tags) ? tags : [],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ discussion: data })
}