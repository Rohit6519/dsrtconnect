import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getProject(supabase: any, slug: string) {
  const { data } = await supabase
    .from('projects')
    .select('id, founder_id, user_id')
    .eq('slug', slug)
    .single()
  return data
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data } = await supabase
      .from('project_domain_assignments')
      .select(`
        id, is_primary, created_at,
        domain:project_domains_taxonomy(id, name, slug, category, is_popular)
      `)
      .eq('project_id', project.id)

    return NextResponse.json({ assignments: data || [] })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
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
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { domain_ids, primary_domain_id } = body

    if (!Array.isArray(domain_ids) || domain_ids.length === 0) {
      return NextResponse.json({ error: 'domain_ids array required' }, { status: 400 })
    }

    const inserts = domain_ids.slice(0, 10).map((id: string) => ({
      project_id: project.id,
      domain_id: id,
      is_primary: id === primary_domain_id,
    }))

    const { data, error } = await supabase
      .from('project_domain_assignments')
      .upsert(inserts, { onConflict: 'project_id,domain_id' })
      .select()

    if (error) throw error
    return NextResponse.json({ success: true, assignments: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
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

  try {
    const project = await getProject(supabase, slug)
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domain_id')
    if (!domainId) return NextResponse.json({ error: 'domain_id required' }, { status: 400 })

    await supabase
      .from('project_domain_assignments')
      .delete()
      .eq('project_id', project.id)
      .eq('domain_id', domainId)

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}