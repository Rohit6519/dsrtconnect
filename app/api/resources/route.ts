import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_SORTS = ['trending', 'newest', 'popular', 'upvoted']

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category') || 'all'
  const sort = VALID_SORTS.includes(searchParams.get('sort') || '') ? searchParams.get('sort') : 'trending'
  const limit = Math.min(parseInt(searchParams.get('limit') || '24'), 60)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const { data, error } = await supabase.rpc('get_resources_by_category', {
      p_category_slug: category,
      p_sort: sort,
      p_viewer_id: user?.id || null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error
    const list = data || []
    return NextResponse.json({
      resources: list,
      pagination: { limit, offset, count: list.length, hasMore: list.length >= limit, nextOffset: offset + list.length },
    })
  } catch (e: any) {
    console.error('Resources list error:', e)
    return NextResponse.json({ error: e?.message, resources: [] }, { status: 500 })
  }
}

// POST — submit new resource (auth required, goes to pending)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sign in to submit' }, { status: 401 })

  try {
    const body = await request.json()
    const url = (body.url || '').trim()
    const title = (body.title || '').trim()
    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: 'Valid URL required' }, { status: 400 })
    }
    if (!title || title.length < 3) {
      return NextResponse.json({ error: 'Title required' }, { status: 400 })
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + Math.random().toString(36).slice(2, 8)

    const insert: Record<string, any> = {
      slug,
      title: title.slice(0, 200),
      description: body.description ? String(body.description).slice(0, 500) : null,
      url: url.slice(0, 500),
      cover_image_url: body.cover_image_url || null,
      category_id: body.category_id || null,
      resource_type: body.resource_type || 'article',
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 10) : [],
      difficulty: body.difficulty || 'all',
      publisher: body.publisher ? String(body.publisher).slice(0, 120) : null,
      is_free: body.is_free !== false,
      submitted_by: user.id,
      is_approved: false,
    }

    const { data, error } = await supabase.from('resources').insert(insert).select().single()
    if (error) throw error

    return NextResponse.json({ success: true, resource: data, message: 'Submitted for review. It will appear once approved.' })
  } catch (e: any) {
    console.error('Submit resource error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
