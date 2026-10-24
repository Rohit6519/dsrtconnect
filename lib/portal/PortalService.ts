import { createClient } from '@/lib/supabase/server'

/**
 * PortalService assembles everything a candidate needs to see for
 * one application, filtering out anything internal (reviewer notes,
 * scorecards, private feedback, internal rejection reasons).
 */
export class PortalService {
  static async load(application_id: string, candidate_id: string) {
    const supabase = await createClient()

    // 1. Application row + guard
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('*')
      .eq('id', application_id)
      .eq('applicant_id', candidate_id)
      .single()
    if (!app) throw new Error('Application not found')

    // 2. Opportunity + linked entity
    const { data: opp } = await supabase
      .from('opportunities')
      .select('id, slug, title, opportunity_number, opportunity_type, status, poster_user_id, project_id, venture_id, application_deadline, work_mode, time_commitment, hours_per_week, compensation_type, compensation_min, compensation_max, compensation_currency')
      .eq('id', app.opportunity_id)
      .single()
    if (!opp) throw new Error('Opportunity not found')

    const [projectRes, ventureRes, posterRes] = await Promise.all([
      opp.project_id
        ? supabase.from('projects').select('id, name, slug, icon').eq('id', opp.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
      opp.venture_id
        ? supabase.from('ventures').select('id, name, slug, logo_url').eq('id', opp.venture_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from('users').select('id, username, full_name, avatar_url, is_verified').eq('id', opp.poster_user_id).maybeSingle(),
    ])

    // 3. Timeline — from workflow events, but strip internal-only types
    const HIDDEN_EVENTS = new Set([
      'note_added',
      'starred',
      'unstarred',
      'reviewer_assigned',
      'reviewer_unassigned',
      'interview_feedback_submitted',
    ])
    const { data: rawEvents } = await supabase
      .from('application_workflow_events')
      .select('id, event_type, from_stage, to_stage, reason, source, metadata, created_at')
      .eq('application_id', application_id)
      .order('created_at', { ascending: true })
    const events = (rawEvents || [])
      .filter(e => !HIDDEN_EVENTS.has(e.event_type))
      // Strip internal metadata keys before returning
      .map(e => {
        const meta: any = e.metadata || {}
        return {
          ...e,
          metadata: {
            template_key: meta.template_key,
            channel: meta.channel,
            interview_id: meta.interview_id,
            to_stage: meta.to_stage,
            scheduled_at: meta.scheduled_at,
          },
        }
      })

    // 4. Messages — candidate-facing DSRT Mail thread on this application
    const { data: rawMessages } = await supabase
      .from('inbox_messages')
      .select('id, sender_id, recipient_id, subject, body, status, created_at, message_type, metadata')
      .eq('reference_type', 'opportunity_application')
      .eq('reference_id', application_id)
      .in('recipient_id', [candidate_id, opp.poster_user_id])
      .in('sender_id', [candidate_id, opp.poster_user_id])
      .order('created_at', { ascending: true })

    const messages = (rawMessages || []).map(m => ({
      id: m.id,
      subject: m.subject,
      body: m.body,
      created_at: m.created_at,
      is_mine: m.sender_id === candidate_id,
      status: m.status,
      message_type: m.message_type,
    }))

    // 5. Interviews
    const { data: interviews } = await supabase
      .from('interviews')
      .select('id, kind, title, description, scheduled_at, duration_min, timezone, location_type, location_url, location_address, status, candidate_message')
      .eq('application_id', application_id)
      .order('scheduled_at', { ascending: false, nullsFirst: false })

    // Load candidate's response for each
    const ivIds = (interviews || []).map(i => i.id)
    const { data: participantsRaw } = ivIds.length
      ? await supabase
          .from('interview_participants')
          .select('interview_id, user_id, role, response, response_at')
          .in('interview_id', ivIds)
      : { data: [] }
    const byInterview = new Map<string, any[]>()
    for (const p of participantsRaw || []) {
      if (!byInterview.has(p.interview_id)) byInterview.set(p.interview_id, [])
      byInterview.get(p.interview_id)!.push(p)
    }
    const enrichedInterviews = (interviews || []).map(iv => {
      const parts = byInterview.get(iv.id) || []
      const myResp = parts.find(p => p.user_id === candidate_id)
      return {
        ...iv,
        my_response: myResp?.response || 'pending',
        interviewer_count: parts.filter(p => p.role === 'interviewer' || p.role === 'hiring_manager').length,
      }
    })

    // 6. Availability slots proposed by me
    const { data: mySlots } = await supabase
      .from('interview_availability_slots')
      .select('id, start_at, end_at, timezone, status, created_at')
      .eq('application_id', application_id)
      .eq('proposed_by', candidate_id)
      .order('start_at', { ascending: true })

    // 7. Read marker
    const { data: reads } = await supabase
      .from('application_candidate_reads')
      .select('last_seen_at')
      .eq('application_id', application_id)
      .maybeSingle()
    const lastSeenAt = reads?.last_seen_at || null

    const unread_message_count = messages.filter(
      m => !m.is_mine && m.status === 'unread'
    ).length

    // 8. Documents (candidate-supplied)
    const documents = [
      app.resume_url    ? { key: 'resume',    label: 'Resume',    url: app.resume_url } : null,
      app.portfolio_url ? { key: 'portfolio', label: 'Portfolio', url: app.portfolio_url } : null,
      app.github_url    ? { key: 'github',    label: 'GitHub',    url: app.github_url } : null,
      app.linkedin_url  ? { key: 'linkedin',  label: 'LinkedIn',  url: app.linkedin_url } : null,
      app.website_url   ? { key: 'website',   label: 'Website',   url: app.website_url } : null,
    ].filter(Boolean)

    return {
      application: {
        id: app.id,
        pipeline_stage: app.pipeline_stage,
        status: app.status,
        created_at: app.created_at,
        updated_at: app.updated_at,
        stage_updated_at: app.stage_updated_at,
        cover_message: app.cover_message,
        cover_letter: app.cover_letter,
        highlighted_skills: app.highlighted_skills || [],
        availability: app.availability,
        expected_hours: app.expected_hours,
        proposed_compensation: app.proposed_compensation,
        proposed_compensation_currency: app.proposed_compensation_currency,
        proposed_compensation_type: app.proposed_compensation_type,
      },
      opportunity: {
        ...opp,
        project: projectRes.data,
        venture: ventureRes.data,
        poster: posterRes.data,
      },
      events,
      messages,
      interviews: enrichedInterviews,
      my_availability_slots: mySlots || [],
      documents,
      unread_message_count,
      last_seen_at: lastSeenAt,
    }
  }
}