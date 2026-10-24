import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    // Try by ID first, then by slug
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let query = supabase.from('opportunities').select('*')
    if (isUUID) {
      query = query.eq('id', id)
    } else {
      query = query.eq('slug', id)
    }

    const { data: opportunity, error } = await query.single()

    if (error || !opportunity) {
      return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
    }

    // Enrich
    const [posterRes, projectRes, ventureRes, categoryRes, subcategoryRes, mediaRes] = await Promise.all([
      opportunity.poster_user_id
        ? supabase.from('users').select('id, username, full_name, avatar_url, tagline, bio, is_verified, follower_count, location').eq('id', opportunity.poster_user_id).single()
        : Promise.resolve({ data: null }),
      opportunity.project_id
        ? supabase.from('projects').select('id, slug, name, tagline, description, icon, cover_image_url, stage, follower_count').eq('id', opportunity.project_id).single()
        : Promise.resolve({ data: null }),
      opportunity.venture_id
        ? supabase.from('ventures').select('id, slug, name, tagline, description, logo_url, cover_url, stage, industry, follower_count').eq('id', opportunity.venture_id).single()
        : Promise.resolve({ data: null }),
      opportunity.primary_category_id
        ? supabase.from('opportunity_categories').select('id, name, slug, icon').eq('id', opportunity.primary_category_id).single()
        : Promise.resolve({ data: null }),
      opportunity.subcategory_id
        ? supabase.from('opportunity_categories').select('id, name, slug, icon').eq('id', opportunity.subcategory_id).single()
        : Promise.resolve({ data: null }),
      supabase.from('opportunity_media').select('*').eq('opportunity_id', opportunity.id).order('position'),
    ])

    // Check if current user saved / applied
        let isSaved = false
    let hasApplied = false
    let applicationData = null
    if (user) {
      const [saveRes, appRes] = await Promise.all([
        supabase.from('opportunity_saves')
          .select('user_id').eq('user_id', user.id).eq('opportunity_id', opportunity.id).maybeSingle(),
        supabase.from('opportunity_applications')
          .select('id, pipeline_stage, status, created_at').eq('applicant_id', user.id).eq('opportunity_id', opportunity.id).maybeSingle(),
      ])
      isSaved = !!saveRes.data
      applicationData = appRes.data || null
      // They are only considered "applied" if they passed the draft stage
      hasApplied = !!appRes.data && appRes.data.pipeline_stage !== 'draft'
    }

    const isOwner = user?.id === opportunity.poster_user_id
    const isClosed = ['closed', 'filled', 'archived', 'expired'].includes(opportunity.status) ||
                     (opportunity.application_deadline && new Date(opportunity.application_deadline) < new Date())

    return NextResponse.json({
      ...opportunity,
      poster: posterRes.data,
      project: projectRes.data,
      venture: ventureRes.data,
      primary_category: categoryRes.data,
      subcategory: subcategoryRes.data,
      media: mediaRes.data || [],
      is_saved: isSaved,
      has_applied: hasApplied,
      application: applicationData,
      is_owner: isOwner,
      is_closed: isClosed,
    })
  } catch (e: any) {
    console.error('Get opportunity error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: existing } = await supabase.from('opportunities')
      .select('poster_user_id, status').eq('id', id).single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))

    // Don't allow changing these
    delete body.id
    delete body.poster_user_id
    delete body.opportunity_number
    delete body.slug
    delete body.created_at
    delete body.view_count
    delete body.application_count
    delete body.save_count
    delete body.search_vector

    // If status changing to active for first time, set published_at
    if (body.status === 'active' && existing.status === 'draft') {
      body.published_at = new Date().toISOString()
    }

    body.last_activity_at = new Date().toISOString()

    const { data: opportunity, error } = await supabase
      .from('opportunities')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ opportunity })
  } catch (e: any) {
    console.error('Update opportunity error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data: existing } = await supabase.from('opportunities')
      .select('poster_user_id').eq('id', id).single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.poster_user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Delete opportunity error:', e)
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}