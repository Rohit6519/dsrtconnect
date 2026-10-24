import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Draft id or slug required' }, { status: 400 })

  try {
    const isUuid = UUID_REGEX.test(id)

    // Query safely by ID or SLUG depending on format to prevent PostgreSQL UUID type casting errors
    let query = supabase
      .from('projects')
      .select('*')

    if (isUuid) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data, error } = await query
      .or(`founder_id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      return NextResponse.json({ error: 'Draft not found or access denied' }, { status: 404 })
    }

    const draft = {
      id: data.id,
      name: data.name || '',
      project_type: data.project_type || 'software',
      tagline: data.tagline || data.short_description || '',
      logo_url: data.logo_url || null,
      cover_image_url: data.cover_image_url || null,
      description: data.description || data.about_content || '',
      problem_statement: data.problem_statement || '',
      goals: data.goals || '',
      primary_domain: data.industry || '',
      domains: Array.isArray(data.category) ? data.category : [],
      stage: data.stage || 'idea',
      technologies: Array.isArray(data.tech_stack) ? data.tech_stack : [],
      repository_url: data.repository_url || '',
      is_open_source: !!data.is_open_source,
      license: data.license || '',
      collaboration_status: data.collaboration_status || 'solo',
      collaborators: [],
      looking_for_roles: [],
      visibility: data.visibility === 'draft' ? 'public' : (data.visibility || 'public'),
      show_in_explore: data.show_in_explore !== false,
      show_on_profile: true,
    }

    return NextResponse.json({ success: true, draft })
  } catch (error: any) {
    console.error('[Load Draft] error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to load draft' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!id) return NextResponse.json({ error: 'Draft id or slug required' }, { status: 400 })

  try {
    const isUuid = UUID_REGEX.test(id)

    // First, verify the project exists, belongs to the user, and IS A DRAFT
    let verifyQuery = supabase
      .from('projects')
      .select('id, status')
      .eq('status', 'draft')

    if (isUuid) {
      verifyQuery = verifyQuery.eq('id', id)
    } else {
      verifyQuery = verifyQuery.eq('slug', id)
    }

    const { data: project, error: verifyErr } = await verifyQuery
      .or(`founder_id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle()

    if (verifyErr || !project) {
      return NextResponse.json({ error: 'Draft not found or cannot be deleted' }, { status: 404 })
    }

    // Perform deletion
    const { error: deleteErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', project.id)

    if (deleteErr) throw deleteErr

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Delete Draft] error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to delete draft' }, { status: 500 })
  }
}