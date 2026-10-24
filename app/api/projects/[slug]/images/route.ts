import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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

    if (!project) return NextResponse.json({ images: [] })

    const { data, error } = await supabase
      .from('project_images')
      .select('*')
      .eq('project_id', project.id)
      .order('position')

    if (error) throw error
    return NextResponse.json({ images: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message, images: [] }, { status: 500 })
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
    const url = (body.url || '').trim()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { count } = await supabase
      .from('project_images')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id)

    if ((count || 0) >= 3) {
      return NextResponse.json({ error: 'Max 3 media items allowed' }, { status: 400 })
    }

    const { data: last } = await supabase
      .from('project_images')
      .select('position')
      .eq('project_id', project.id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextPos = (last?.position ?? -1) + 1

    const { data, error } = await supabase
      .from('project_images')
      .insert({
        project_id: project.id,
        url,
        caption: body.caption ? String(body.caption).slice(0, 200) : null,
        type: body.type || 'image',
        position: nextPos,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ success: true, image: data })
  } catch (error: any) {
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
      .from('project_images')
      .delete()
      .eq('id', id)
      .eq('project_id', project.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
