import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['pending','reviewing','shortlisted','rejected','accepted','withdrawn']

export async function PATCH(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await context.params
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

    const isOwner = project.founder_id === user.id || project.user_id === user.id
    if (!isOwner) {
      const { data: perm } = await supabase
        .from('project_permissions')
        .select('can_review_applicants')
        .eq('project_id', project.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (!perm?.can_review_applicants) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const patch: Record<string, any> = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    }
    if (body.status && VALID_STATUSES.includes(body.status)) patch.status = body.status
    if (typeof body.reviewer_notes === 'string') patch.reviewer_notes = body.reviewer_notes.slice(0, 5000)

    const { data, error } = await supabase
      .from('project_role_applications')
      .update(patch)
      .eq('id', id)
      .eq('project_id', project.id)
      .select('*, applicant:users!project_role_applications_applicant_id_fkey(id, full_name, username, avatar_url)')
      .single()

    if (error) throw error

    // Notify applicant of status change
    if (body.status && ['accepted', 'rejected', 'shortlisted'].includes(body.status)) {
      const messages: Record<string, string> = {
        accepted: 'Your application was accepted',
        rejected: 'Your application was reviewed',
        shortlisted: 'You have been shortlisted',
      }
      await supabase.from('notifications').insert({
        user_id: data.applicant_id,
        type: 'application_status',
        from_user_id: user.id,
        entity_type: 'application',
        entity_id: data.id,
        title: messages[body.status] || 'Application status changed',
        message: 'Your application status has been updated',
        action_url: '/projects/' + slug,
      }).then(() => {}, () => {})
    }

    return NextResponse.json({ success: true, application: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}
