import { createClient } from '@/lib/supabase/server'

/** Notify the opportunity owner when an application event happens */
export async function notifyOwnerInApp(job: any) {
  const supabase = await createClient()

  const { data: app } = await supabase
    .from('opportunity_applications')
    .select('id, opportunity_id, applicant_id, applicant_snapshot')
    .eq('id', job.application_id)
    .single()
  if (!app) throw new Error('application not found')

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, title, slug, poster_user_id')
    .eq('id', app.opportunity_id)
    .single()
  if (!opp) throw new Error('opportunity not found')

  const snap: any = app.applicant_snapshot || {}
  const applicantName = snap.full_name || snap.username || 'A builder'

  const reason = job.payload?.reason as string | undefined
  const title =
    reason === 'withdrawn' ? `${applicantName} withdrew their application`
    : reason === 'submitted' || reason === 'applied' ? `${applicantName} applied to ${opp.title}`
    : `Update on application for ${opp.title}`

  await tryInsertNotification({
    user_id: opp.poster_user_id,
    type: 'application_update',
    title,
    body: opp.title,
    link: `/looking-for/my-opportunities/${opp.id}?tab=applicants&app=${app.id}`,
    metadata: {
      application_id: app.id,
      opportunity_id: opp.id,
      applicant_id: app.applicant_id,
      reason,
    },
  })
}

/** Notify the candidate when the owner moves them forward */
export async function notifyCandidateInApp(job: any) {
  const supabase = await createClient()

  const { data: app } = await supabase
    .from('opportunity_applications')
    .select('id, opportunity_id, applicant_id')
    .eq('id', job.application_id)
    .single()
  if (!app) throw new Error('application not found')

  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, title, slug')
    .eq('id', app.opportunity_id)
    .single()
  if (!opp) throw new Error('opportunity not found')

  const stage = job.payload?.to_stage as string
  const label =
    stage === 'reviewing'    ? 'Your application is now under review'
    : stage === 'screening'    ? 'You have been shortlisted'
    : stage === 'interviewing' ? 'You have been invited to interview'
    : stage === 'offered'      ? 'You have an offer'
    : stage === 'hired'        ? 'You have been selected'
    : stage === 'rejected'     ? 'Your application was not selected'
    :                            'Your application status changed'

  await tryInsertNotification({
    user_id: app.applicant_id,
    type: 'application_status',
    title: label,
    body: opp.title,
    link: `/looking-for/my-applications/${app.id}`,
    metadata: {
      application_id: app.id,
      opportunity_id: opp.id,
      to_stage: stage,
    },
  })
}

/**
 * Best-effort insert into whichever notifications table exists in your project.
 * We try `home_notifications` first (used by your top-nav bell). If it doesn't
 * exist we silently fall back — the workflow event is already recorded.
 */
async function tryInsertNotification(row: {
  user_id: string
  type: string
  title: string
  body?: string
  link?: string
  metadata?: any
}) {
  const supabase = await createClient()
  const payload = {
    user_id: row.user_id,
    notification_type: row.type,
    title: row.title,
    body: row.body || null,
    link_url: row.link || null,
    metadata: row.metadata || {},
    is_read: false,
  }
  const { error } = await supabase.from('home_notifications').insert(payload)
  if (error) {
    // Fallback: try `notifications` (if you standardise later)
    await supabase.from('notifications').insert(payload).then(() => {}, () => {})
  }
}