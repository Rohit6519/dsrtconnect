import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const source = searchParams.get('source') || 'team_up'

  const { data, error } = await supabase
    .from('team_up_unified')
    .select('*')
    .eq('source_type', source)
    .eq('source_id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  const [ownerRes, ventureRes, projectRes] = await Promise.all([
    data.owner_id
      ? supabase.from('users').select('id, username, full_name, avatar_url, tagline, bio, is_verified, follower_count').eq('id', data.owner_id).single()
      : Promise.resolve({ data: null }),
    data.venture_id
      ? supabase.from('ventures').select('id, slug, name, logo_url, cover_url, tagline, description, industry, stage, follower_count').eq('id', data.venture_id).single()
      : Promise.resolve({ data: null }),
    data.project_id
      ? supabase.from('projects').select('id, slug, name, logo_url, cover_image_url, tagline, description, industry, stage, follower_count, icon').eq('id', data.project_id).single()
      : Promise.resolve({ data: null }),
  ])

  let customQuestions: any[] = []
  if (source === 'team_up') {
    const { data: tur } = await supabase.from('team_up_requests').select('custom_questions').eq('id', id).single()
    customQuestions = (tur?.custom_questions as any[]) || []
  } else if (source === 'venture_lf') {
    const { data: vlf } = await supabase.from('venture_looking_for').select('custom_questions').eq('id', id).single()
    customQuestions = (vlf?.custom_questions as any[]) || []
  } else if (source === 'project_role') {
    const { data: pr } = await supabase.from('project_roles').select('custom_questions').eq('id', id).single()
    customQuestions = (pr?.custom_questions as any[]) || []
  }

  const { data: { user } } = await supabase.auth.getUser()
  let hasApplied = false
  let isSaved = false
  if (user) {
    const applicationFilter =
      source === 'team_up' ? { request_id: id } :
      source === 'venture_lf' ? { venture_lf_id: id } :
      { project_role_id: id }

    const { data: app } = await supabase
      .from('looking_for_applications')
      .select('id')
      .match({ ...applicationFilter, applicant_id: user.id })
      .maybeSingle()
    hasApplied = !!app

    const { data: save } = await supabase
      .from('team_up_saves')
      .select('id')
      .match({ user_id: user.id, source_type: source, source_id: id })
      .maybeSingle()
    isSaved = !!save
  }

  return NextResponse.json({
    ...data,
    owner: ownerRes.data,
    venture: ventureRes.data,
    project: projectRes.data,
    custom_questions: customQuestions,
    has_applied: hasApplied,
    is_saved: isSaved,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('team_up_requests').select('user_id').eq('id', id).single()
  if (!existing || existing.user_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  delete body.id
  delete body.user_id
  delete body.request_number
  delete body.slug
  delete body.created_at
  delete body.view_count
  delete body.application_count

  const { data, error } = await supabase.from('team_up_requests')
    .update(body).eq('id', id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ request: data })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase.from('team_up_requests').select('user_id').eq('id', id).single()
  if (!existing || existing.user_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('team_up_requests').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
