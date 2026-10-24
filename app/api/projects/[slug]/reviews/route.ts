import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
  const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, rating_avg, rating_count')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ reviews: [] })

    const { data, error } = await supabase.rpc('get_project_reviews_threaded', {
      p_project_id: project.id,
      p_viewer_id: user?.id || null,
      p_limit: limit,
      p_offset: offset,
    })

    if (error) throw error

    return NextResponse.json({
      reviews: data || [],
      rating_avg: project.rating_avg,
      rating_count: project.rating_count,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, reviews: [] }, { status: 500 })
  }
}

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
    const content = (body.content || '').trim()
    const parent_id = body.parent_id || null
    const rating = body.rating ? Math.max(1, Math.min(5, parseInt(body.rating))) : null

    if (!content || content.length < 2) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const insertData: Record<string, any> = {
      project_id: project.id,
      user_id: user.id,
      parent_id,
      content: content.slice(0, 3000),
    }
    if (!parent_id && rating) insertData.rating = rating

    const { data: review, error } = await supabase
      .from('project_reviews')
      .insert(insertData)
      .select('*, user:users!project_reviews_user_id_fkey(id, full_name, username, avatar_url, is_verified)')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'You already replied here' }, { status: 409 })
      }
      throw error
    }

    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: parent_id ? 'comment' : 'review',
      entity_type: 'project',
      entity_id: project.id,
      weight: parent_id ? 1.5 : 3.0,
    }).then(() => {}, () => {})

    return NextResponse.json({ success: true, review })
  } catch (error: any) {
    console.error('Create review error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
