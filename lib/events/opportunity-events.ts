import { createClient } from '@/lib/supabase/server'

export const OPP_EVENT_TYPES = [
  'opportunity_viewed',
  'opportunity_opened',
  'profile_opened',
  'requirements_expanded',
  'apply_clicked',
  'application_started',
  'application_abandoned',
  'application_submitted',
  'opportunity_saved',
  'opportunity_unsaved',
  'opportunity_shared',
  'share_link_opened',
  'message_clicked',
  'applicant_shortlisted',
  'applicant_rejected',
  'applicant_contacted',
  'interview_started',
  'interview_completed',
  'applicant_selected',
  'opportunity_paused',
  'opportunity_closed',
  'opportunity_resumed',
  'opportunity_published',
] as const

export type OppEventType = (typeof OPP_EVENT_TYPES)[number]

const EVENT_TO_DAILY_FIELD: Partial<Record<OppEventType, string>> = {
  opportunity_viewed: 'views',
  opportunity_opened: 'views',
  opportunity_saved: 'saves',
  opportunity_shared: 'shares',
  apply_clicked: 'apply_clicks',
  application_started: 'applications_started',
  application_submitted: 'applications_submitted',
  application_abandoned: 'applications_abandoned',
  applicant_shortlisted: 'shortlisted_count',
  interview_started: 'interviewed_count',
  applicant_selected: 'selected_count',
  applicant_rejected: 'rejected_count',
}

export function makeEventId(prefix = 'evt'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export async function trackOpportunityEvent(input: {
  event_id?: string
  opportunity_id: string
  user_id?: string | null
  session_id?: string | null
  event_type: OppEventType | string
  source?: string
  referrer_url?: string | null
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()
  const eventId = input.event_id || makeEventId()
  const today = new Date().toISOString().slice(0, 10)

  // Idempotent insert
  const { error } = await supabase.from('opportunity_events').insert({
    event_id: eventId,
    opportunity_id: input.opportunity_id,
    user_id: input.user_id || null,
    session_id: input.session_id || null,
    event_type: input.event_type,
    source: input.source || 'direct',
    referrer_url: input.referrer_url || null,
    metadata: input.metadata || {},
  })

  // Duplicate event_id = already processed
  if (error) {
    if (error.code === '23505') return { ok: true, duplicate: true, event_id: eventId }
    console.error('trackOpportunityEvent error:', error)
    return { ok: false, error: error.message, event_id: eventId }
  }

  // Best-effort daily aggregate
  const field = EVENT_TO_DAILY_FIELD[input.event_type as OppEventType]
  if (field) {
    await supabase.rpc('upsert_opportunity_daily_metric', {
      p_opp_id: input.opportunity_id,
      p_date: today,
      p_field: field,
      p_delta: 1,
    }).then(() => {}, () => {})
  }

  // Source metrics for views / applications
  if (['opportunity_viewed', 'opportunity_opened', 'application_submitted'].includes(input.event_type)) {
    const source = input.source || 'direct'
    const isApp = input.event_type === 'application_submitted'
    try {
      await supabase.from('opportunity_source_metrics').upsert(
        {
          opportunity_id: input.opportunity_id,
          source,
          date: today,
          views: isApp ? 0 : 1,
          applications: isApp ? 1 : 0,
        },
        { onConflict: 'opportunity_id,source,date', ignoreDuplicates: false }
      )
      // If row existed, increment manually
      if (!isApp) {
        await supabase.rpc('upsert_opportunity_daily_metric', {
          p_opp_id: input.opportunity_id,
          p_date: today,
          p_field: 'views',
          p_delta: 0, // no-op if already counted
        }).then(() => {}, () => {})
      }
    } catch {}
  }

  return { ok: true, duplicate: false, event_id: eventId }
}

export async function writeOpportunityAudit(input: {
  opportunity_id: string
  actor_id: string
  action: string
  target_type?: string
  target_id?: string
  before_state?: any
  after_state?: any
  reason?: string
}) {
  const supabase = await createClient()
  await supabase.from('opportunity_audit_log').insert({
    opportunity_id: input.opportunity_id,
    actor_id: input.actor_id,
    action: input.action,
    target_type: input.target_type || null,
    target_id: input.target_id || null,
    before_state: input.before_state || null,
    after_state: input.after_state || null,
    reason: input.reason || null,
  }).then(() => {}, (e) => console.error('audit write failed', e))
}