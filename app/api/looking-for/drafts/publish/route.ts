import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data: draft } = await supabase.from('team_up_drafts')
    .select('*').eq('id', id).eq('user_id', user.id).single()

  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  if (!draft.title?.trim()) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  if (draft.context_type === 'project' && draft.project_id) {
    const { data: proj } = await supabase.from('projects')
      .select('founder_id, user_id').eq('id', draft.project_id).single()
    if (!proj || (proj.founder_id !== user.id && proj.user_id !== user.id))
      return NextResponse.json({ error: 'Not authorized for this project' }, { status: 403 })
  }
  if (draft.context_type === 'venture' && draft.venture_id) {
    const { data: vent } = await supabase.from('ventures')
      .select('user_id, founder_id').eq('id', draft.venture_id).single()
    if (!vent || (vent.user_id !== user.id && vent.founder_id !== user.id))
      return NextResponse.json({ error: 'Not authorized for this venture' }, { status: 403 })
  }
  if (draft.context_type === 'organization' && draft.organization_id) {
    const { data: orgMember } = await supabase.from('organization_members')
      .select('role').eq('user_id', user.id).eq('organization_id', draft.organization_id)
      .in('role', ['owner', 'admin', 'leader']).eq('status', 'active').maybeSingle()
    if (!orgMember) return NextResponse.json({ error: 'Not authorized for this organization' }, { status: 403 })
  }

  const appCfg = draft.application_config || {}
  const publishPayload: any = {
    title: draft.title,
    subline: draft.subline,
    cover_image_url: draft.cover_image_url,
    content_blocks: draft.content_blocks,
    content_html: draft.content_html,
    content_text: draft.content_text,
    description: draft.content_text?.slice(0, 4000) || null,
    request_type: draft.request_type || 'collaborate',
    role_category: draft.role_category,
    employment_type: draft.employment_type,
    work_mode: draft.work_mode || 'remote',
    location: draft.location,
    experience_level: draft.experience_level,
    required_skills: draft.required_skills || [],
    nice_to_have_skills: draft.nice_to_have_skills || [],
    context_type: draft.context_type || 'personal',
    project_id: draft.project_id,
    venture_id: draft.venture_id,
    organization_id: draft.organization_id,
    custom_questions: draft.custom_questions || [],
    visibility: appCfg.visibility || 'everyone',
    applications_open: appCfg.applications_open !== false,
    application_deadline: appCfg.application_deadline || null,
    require_resume: !!appCfg.require_resume,
    require_portfolio: !!appCfg.require_portfolio,
    require_github: !!appCfg.require_github,
    require_website: !!appCfg.require_website,
    require_cover_letter: !!appCfg.require_cover_letter,
    status: 'active',
    use_document_editor: true,
  }

  let published: any
  if (draft.request_id) {
    const { data, error } = await supabase.from('team_up_requests')
      .update(publishPayload).eq('id', draft.request_id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    published = data
  } else {
    const { data, error } = await supabase.from('team_up_requests')
      .insert({ user_id: user.id, ...publishPayload }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    published = data
  }

  // Migrate media items from draft -> published request
  await supabase.from('team_up_media')
    .update({ request_id: published.id, draft_id: null })
    .eq('draft_id', id)
    .eq('user_id', user.id)

  // Delete draft
  await supabase.from('team_up_drafts').delete().eq('id', id).eq('user_id', user.id)

  return NextResponse.json({ request: published }, { status: 201 })
}
