import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['website', 'github', 'twitter', 'linkedin', 'instagram', 'youtube', 'documentation', 'pitch_deck', 'product_page', 'other']

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ links: [] })

    const { data, error } = await supabase
      .from('project_links')
      .select('*')
      .eq('project_id', project.id)
      .order('position')

    if (error) throw error
    return NextResponse.json({ links: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, links: [] }, { status: 500 })
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
    const type = VALID_TYPES.includes(body.type) ? body.type : 'other'
    const url = (body.url || '').trim()
    const label = body.label ? String(body.label).slice(0, 60) : null

    if (!url || !/^https?:\/\//.test(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: last } = await supabase
      .from('project_links')
      .select('position')
      .eq('project_id', project.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPos = (last?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('project_links')
      .insert({
        project_id: project.id,
        type,
        label,
        url: url.slice(0, 500),
        position: nextPos,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, link: data })
  } catch (error: any) {
    console.error('Add link error:', error)
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabase
      .from('project_links')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
