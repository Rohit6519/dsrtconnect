import { createClient } from '@/lib/supabase/server'
import type { AutomationContext } from './types'

/**
 * Returns true if the condition is satisfied.
 * Non-existent conditions log and default to `false` (safer than allowing).
 */
export class RuleEvaluator {
  static async evaluate(condition_key: string, config: any, ctx: AutomationContext): Promise<boolean> {
    switch (condition_key) {
      case 'stage_equals':        return this.stageEquals(config, ctx)
      case 'stage_in':            return this.stageIn(config, ctx)
      case 'has_scheduled_interview':  return this.hasScheduledInterview(ctx)
      case 'no_availability_shared':   return this.noAvailability(ctx)
      case 'candidate_replied_recently': return this.candidateRepliedRecently(config, ctx)
      case 'interview_still_scheduled': return this.interviewStillScheduled(ctx)
      case 'is_verified_candidate':   return this.isVerifiedCandidate(ctx)
      default:
        console.warn('[automation] unknown condition', condition_key)
        return false
    }
  }

  private static async stageEquals(config: any, ctx: AutomationContext) {
    const supabase = await createClient()
    const { data } = await supabase.from('opportunity_applications')
      .select('pipeline_stage').eq('id', ctx.application_id).single()
    return data?.pipeline_stage === config.stage
  }

  private static async stageIn(config: any, ctx: AutomationContext) {
    const supabase = await createClient()
    const list = String(config.stages || '').split(',').map((s: string) => s.trim()).filter(Boolean)
    if (list.length === 0) return false
    const { data } = await supabase.from('opportunity_applications')
      .select('pipeline_stage').eq('id', ctx.application_id).single()
    return !!data && list.includes(data.pipeline_stage)
  }

  private static async hasScheduledInterview(ctx: AutomationContext) {
    const supabase = await createClient()
    const { data } = await supabase.from('interviews')
      .select('id').eq('application_id', ctx.application_id)
      .eq('status', 'confirmed').limit(1)
    return (data || []).length > 0
  }

  private static async noAvailability(ctx: AutomationContext) {
    const supabase = await createClient()
    const { data } = await supabase.from('interview_availability_slots')
      .select('id').eq('application_id', ctx.application_id)
      .eq('proposer_role', 'candidate').limit(1)
    return (data || []).length === 0
  }

  private static async candidateRepliedRecently(config: any, ctx: AutomationContext) {
    const supabase = await createClient()
    const hours = Number(config.hours || 0)
    if (!hours) return false
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
    const { data } = await supabase.from('application_workflow_events')
      .select('id').eq('application_id', ctx.application_id)
      .eq('event_type', 'communication_replied').gte('created_at', since).limit(1)
    return (data || []).length > 0
  }

  private static async interviewStillScheduled(ctx: AutomationContext) {
    const supabase = await createClient()
    const interview_id = ctx.event?.metadata?.interview_id
    if (!interview_id) return false
    const { data } = await supabase.from('interviews').select('status').eq('id', interview_id).single()
    return data?.status === 'confirmed'
  }

  private static async isVerifiedCandidate(ctx: AutomationContext) {
    const supabase = await createClient()
    const { data: app } = await supabase.from('opportunity_applications')
      .select('applicant_id').eq('id', ctx.application_id).single()
    if (!app) return false
    const { data: u } = await supabase.from('users').select('is_verified').eq('id', app.applicant_id).maybeSingle()
    return !!u?.is_verified
  }
}