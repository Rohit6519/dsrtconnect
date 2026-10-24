import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import slugify from 'slugify'

export const dynamic = 'force-dynamic'

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
    const ventureName = body.venture_name?.trim()

    if (!ventureName) {
      return NextResponse.json({ error: 'Venture name is required' }, { status: 400 })
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, domain_assignments:project_domain_assignments(domain_id, domain:project_domains_taxonomy(name))')
      .eq('slug', slug)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      return NextResponse.json({ error: 'Only the project owner can convert it to a venture' }, { status: 403 })
    }

    if (project.parent_venture_id) {
      return NextResponse.json({ error: 'This project is already part of a venture' }, { status: 400 })
    }

    let ventureSlug = slugify(ventureName, { lower: true, strict: true })
    const { data: existing } = await supabase.from('ventures').select('id').eq('slug', ventureSlug).maybeSingle()
    if (existing) {
      ventureSlug = `${ventureSlug}-${Math.random().toString(36).substring(2, 8)}`
    }

    const primaryDomain = project.domain_assignments?.[0]?.domain?.name || project.industry || null

    const { data: newVenture, error: ventureError } = await supabase
      .from('ventures')
      .insert({
        name: ventureName,
        slug: ventureSlug,
        tagline: project.tagline,
        description: project.description,
        industry: primaryDomain,
        logo_url: project.logo_url,
        cover_url: project.cover_image_url,
        founder_id: user.id,
        user_id: user.id,
        stage: 'idea',
        status: 'active',
        is_draft: false,
        show_in_explore: true,
      })
      .select()
      .single()

    if (ventureError) throw ventureError

    const { error: updateError } = await supabase
      .from('projects')
      .update({ parent_venture_id: newVenture.id })
      .eq('id', project.id)

    if (updateError) {
      await supabase.from('ventures').delete().eq('id', newVenture.id)
      throw updateError
    }

    await supabase
      .from('project_venture_conversions')
      .insert({
        project_id: project.id,
        venture_id: newVenture.id,
        converted_by: user.id,
      })

    return NextResponse.json({ success: true, venture: newVenture })
  } catch (error: any) {
    console.error('[Convert to Venture] error:', error)
    return NextResponse.json({ error: error?.message || 'Conversion failed' }, { status: 500 })
  }
}