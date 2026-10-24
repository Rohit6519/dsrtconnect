import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// PATCH /api/looking-for/applications/[appId]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const { appId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: app } = await supabase.from('looking_for_applications')
    .select('request_id, venture_lf_id, project_role_id, source_type').eq('id', appId).single()

  if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let isOwner = false
  if (app.request_id) {
    const { data } = await supabase.from('team_up_requests').select('user_id').eq('id', app.request_id).single()
    isOwner = data?.user_id === user.id
  } else if (app.venture_lf_id) {
    const { data } = await supabase.from('venture_looking_for').select('venture_id').eq('id', app.venture_lf_id).single()
    if (data) {
      const { data: v } = await supabase.from('ventures').select('user_id').eq('id', data.venture_id).single()
      isOwner = v?.user_id === user.id
    }
  } else if (app.project_role_id) {
    const { data } = await supabase.from('project_roles').select('project_id').eq('id', app.project_role_id).single()
    if (data) {
      const { data: p } = await supabase.from('projects').select('founder_id, user_id').eq('id', data.project_id).single()
      isOwner = p?.founder_id === user.id || p?.user_id === user.id
    }
  }

  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { pipeline_stage, internal_notes, internal_rating, is_starred, reviewer_notes } = body

  const update: any = {}
  if (pipeline_stage) update.pipeline_stage = pipeline_stage
  if (internal_notes !== undefined) update.internal_notes = internal_notes
  if (internal_rating !== undefined) update.internal_rating = internal_rating
  if (is_starred !== undefined) update.is_starred = is_starred
  if (reviewer_notes !== undefined) update.reviewer_notes = reviewer_notes
  if (pipeline_stage) update.reviewed_by = user.id
  if (pipeline_stage) update.reviewed_at = new Date().toISOString()

  const { data, error } = await supabase.from('looking_for_applications')
    .update(update).eq('id', appId).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ application: data })
}
