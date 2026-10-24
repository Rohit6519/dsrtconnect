import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import slugify from 'slugify'

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
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ opportunities: [] }, { status: 404 })

    const { data: opportunities, error } = await supabase
      .from('team_up_requests')
      .select('*')
      .eq('project_id', project.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      opportunities: opportunities || [],
      count: (opportunities || []).length,
    })
  } catch (e: any) {
    console.error('[Project Opportunities GET] error:', e)
    return NextResponse.json({ opportunities: [] }, { status: 500 })
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
    const { data: project } = await supabase
      .from('projects')
      .select('id, name, founder_id, user_id, industry, location')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const title = body.title?.trim()

    if (!title) {
      return NextResponse.json({ error: 'Role title is required' }, { status: 400 })
    }

    const oppSlug = `${slugify(title, { lower: true, strict: true })}-${Math.random().toString(36).substring(2, 6)}`

    const { data: opportunity, error } = await supabase
      .from('team_up_requests')
      .insert({
        user_id: user.id,
        project_id: project.id,
        context_type: 'project',
        request_type: body.request_type || 'collaborate',
        title,
        tagline: body.tagline || `Role for ${project.name}`,
        description: body.description || null,
        required_skills: body.required_skills || [],
        commitment: body.commitment || 'part-time',
        work_mode: body.work_mode || 'remote',
        location: project.location || null,
        industry: project.industry || null,
        status: 'published',
        published_at: new Date().toISOString(),
        slug: oppSlug,
      })
      .select()
      .single()

    if (error) throw error

    await supabase.rpc('increment', {
      table_name: 'projects',
      column_name: 'open_roles',
      row_id: project.id,
    })

    return NextResponse.json({ success: true, opportunity })
  } catch (e: any) {
    console.error('[Project Opportunities POST] error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}