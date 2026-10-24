import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/drafts — get current user's latest draft OR by id
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const requestId = searchParams.get('request_id')

  let query = supabase.from('team_up_drafts').select('*').eq('user_id', user.id).eq('is_current', true)
  if (id) query = query.eq('id', id)
  if (requestId) query = query.eq('request_id', requestId)
  const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

// POST /api/looking-for/drafts — create new draft
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const { data, error } = await supabase.from('team_up_drafts').insert({
    user_id: user.id,
    title: body.title || null,
    subline: body.subline || null,
    cover_image_url: body.cover_image_url || null,
    content_blocks: body.content_blocks || [],
    content_html: body.content_html || null,
    content_text: body.content_text || null,
    request_type: body.request_type || null,
    role_category: body.role_category || null,
    employment_type: body.employment_type || null,
    work_mode: body.work_mode || null,
    location: body.location || null,
    experience_level: body.experience_level || null,
    required_skills: body.required_skills || [],
    nice_to_have_skills: body.nice_to_have_skills || [],
    context_type: body.context_type || 'personal',
    project_id: body.project_id || null,
    venture_id: body.venture_id || null,
    organization_id: body.organization_id || null,
    application_config: body.application_config || {},
    custom_questions: body.custom_questions || [],
    save_source: body.save_source || 'auto',
    version: 1,
    is_current: true,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data }, { status: 201 })
}

// PATCH /api/looking-for/drafts?id=xxx — update existing draft (autosave)
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  delete body.id
  delete body.user_id
  delete body.created_at

  const { data, error } = await supabase.from('team_up_drafts')
    .update(body)
    .eq('id', id)
    .eq('user_id', user.id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

// DELETE /api/looking-for/drafts?id=xxx
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('team_up_drafts')
    .delete().eq('id', id).eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
