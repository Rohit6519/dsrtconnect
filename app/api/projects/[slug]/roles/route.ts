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

    if (!project) return NextResponse.json({ roles: [] })

    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ roles: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, roles: [] }, { status: 500 })
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

    const { data: project } = await supabase
      .from('projects')
      .select('id, founder_id, user_id')
      .eq('slug', slug)
      .single()

    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (project.founder_id !== user.id && project.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const insert: Record<string, any> = {
      project_id: project.id,
      title: (body.title || 'New Role').slice(0, 120),
      description: body.description ? String(body.description).slice(0, 5000) : null,
      responsibilities: Array.isArray(body.responsibilities) ? body.responsibilities.slice(0, 20) : [],
      key_skills: Array.isArray(body.key_skills) ? body.key_skills.slice(0, 20) : [],
      skills_needed: Array.isArray(body.key_skills) ? body.key_skills.slice(0, 20) : [],
      deliverables: Array.isArray(body.deliverables) ? body.deliverables.slice(0, 20) : [],
      employment_type: body.employment_type || 'full-time',
      location_type: body.location_type || 'remote',
      compensation_type: body.compensation_type || 'unpaid',
      compensation_details: body.compensation_details || null,
      min_commitment_hours: body.min_commitment_hours || null,
      positions_open: body.positions_open || 1,
      custom_questions: Array.isArray(body.custom_questions) ? body.custom_questions.slice(0, 10) : [],
      status: 'open',
      icon: body.icon || null,
      color: body.color || 'purple',
      applicants: 0,
    }

    const { data, error } = await supabase
      .from('project_roles')
      .insert(insert)
      .select()
      .single()

    if (error) throw error

    // Bump project open_roles counter
    await supabase.rpc('update_project_completion_from_child', {}).then(() => {}, () => {})

    return NextResponse.json({ success: true, role: data })
  } catch (e: any) {
    console.error('Role create error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
