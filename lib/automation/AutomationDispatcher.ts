import { createClient } from '@/lib/supabase/server'
import type { AutomationContext } from './types'
import { RuleEvaluator } from './RuleEvaluator'
import { ActionRunner } from './ActionRunner'
import { AuditService } from '@/lib/compliance/AuditService'

/**
 * Called from WorkflowService.transition / recordEvent AFTER the event row is written.
 * Finds every matching rule and either runs it inline (no delays) or queues a
 * `run_automation_rule` job in application_workflow_jobs.
 */
export class AutomationDispatcher {
  static async dispatch(ctx: AutomationContext) {
    const supabase = await createClient()
    const triggerType = ctx.event?.event_type

    // Map internal event_types to trigger keys where they diverge:
    const mapped = mapEventToTrigger(triggerType)
    if (!mapped) return

    // Find matching active rules (opportunity-scoped OR owner-org-default)
    const { data: rules } = await supabase.from('workflow_rules')
      .select('*')
      .eq('trigger_type', mapped)
      .eq('is_active', true)
      .or(`opportunity_id.eq.${ctx.opportunity_id},opportunity_id.is.null`)

    for (const rule of rules || []) {
      // Trigger filter check
      if (!matchesTriggerFilters(rule.trigger_config, ctx)) continue

      // Check optional per-opp mute binding
      const { data: binding } = await supabase.from('workflow_rule_bindings')
        .select('is_enabled').eq('rule_id', rule.id).eq('opportunity_id', ctx.opportunity_id).maybeSingle()
      if (binding && binding.is_enabled === false) continue

      // Create a run record
      const { data: run } = await supabase.from('workflow_rule_runs').insert({
        rule_id: rule.id,
        triggering_event_id: ctx.triggering_event_id,
        application_id: ctx.application_id,
        opportunity_id: ctx.opportunity_id,
        status: 'running',
        rule_snapshot: rule,
        context_snapshot: ctx,
      }).select('id').single()

      if (!run) continue

      // Bump run counter
      await supabase.from('workflow_rules').update({
        last_run_at: new Date().toISOString(),
        runs_total: (rule.runs_total || 0) + 1,
      }).eq('id', rule.id)

      // Insert step rows
      const stepRows = (rule.steps || []).map((s: any, i: number) => ({
        run_id: run.id,
        step_index: i,
        step_kind: s.kind,
        step_key: s.key,
        step_config: s.config || {},
        status: 'pending',
      }))
      if (stepRows.length > 0) {
        await supabase.from('workflow_rule_run_steps').insert(stepRows)
      }

      // Queue a job to execute the run's steps
      await supabase.from('application_workflow_jobs').insert({
        application_id: ctx.application_id,
        opportunity_id: ctx.opportunity_id,
        job_type: 'run_automation_rule',
        payload: { run_id: run.id, from_step: 0 },
        status: 'queued',
        scheduled_for: new Date().toISOString(),
      })
    }
  }

  /** Called by JobQueue for `run_automation_rule` jobs */
  static async runRule(run_id: string, from_step: number) {
    const supabase = await createClient()
    const { data: run } = await supabase.from('workflow_rule_runs').select('*').eq('id', run_id).single()
    if (!run) return
    if (run.status !== 'running') return

    const { data: steps } = await supabase.from('workflow_rule_run_steps')
      .select('*').eq('run_id', run_id).order('step_index', { ascending: true })
    if (!steps) return

    const ctx: AutomationContext = run.context_snapshot as AutomationContext
    let succeeded = true

    for (let i = from_step; i < steps.length; i++) {
      const step = steps[i]

      await supabase.from('workflow_rule_run_steps').update({
        status: 'running', started_at: new Date().toISOString(),
      }).eq('id', step.id)

      try {
        if (step.step_kind === 'condition') {
          const ok = await RuleEvaluator.evaluate(step.step_key, step.step_config, ctx)
          await supabase.from('workflow_rule_run_steps').update({
            status: 'done',
            outcome: { condition_result: ok },
            finished_at: new Date().toISOString(),
          }).eq('id', step.id)
          if (!ok) {
            await supabase.from('workflow_rule_runs').update({
              status: 'skipped',
              skip_reason: `Condition ${step.step_key} evaluated false`,
              finished_at: new Date().toISOString(),
            }).eq('id', run_id)
            return
          }
        } else if (step.step_kind === 'action') {
          const outcome = await ActionRunner.run(step.step_key, step.step_config, ctx)
          await supabase.from('workflow_rule_run_steps').update({
            status: outcome.ok ? 'done' : 'failed',
            outcome: outcome.detail,
            error: outcome.error || null,
            finished_at: new Date().toISOString(),
          }).eq('id', step.id)
          if (!outcome.ok) {
            succeeded = false
            await supabase.from('workflow_rule_runs').update({
              status: 'failed',
              error: outcome.error || 'action failed',
              finished_at: new Date().toISOString(),
            }).eq('id', run_id)
            return
          }
        } else if (step.step_kind === 'delay') {
          const scheduled = computeDelayTs(step.step_config, ctx)
          await supabase.from('workflow_rule_run_steps').update({
            status: 'pending',
            scheduled_for: scheduled.toISOString(),
            outcome: { resume_step: i + 1 },
          }).eq('id', step.id)

          // Schedule a resume job at the delay time
          await supabase.from('application_workflow_jobs').insert({
            application_id: ctx.application_id,
            opportunity_id: ctx.opportunity_id,
            job_type: 'run_automation_rule',
            payload: { run_id, from_step: i + 1 },
            status: 'queued',
            scheduled_for: scheduled.toISOString(),
          })
          return
        }
      } catch (e: any) {
        succeeded = false
        await supabase.from('workflow_rule_run_steps').update({
          status: 'failed',
          error: e?.message || String(e),
          finished_at: new Date().toISOString(),
        }).eq('id', step.id)
        await supabase.from('workflow_rule_runs').update({
          status: 'failed',
          error: e?.message || String(e),
          finished_at: new Date().toISOString(),
        }).eq('id', run_id)
        return
      }
    }

    await supabase.from('workflow_rule_runs').update({
      status: succeeded ? 'completed' : 'failed',
      finished_at: new Date().toISOString(),
    }).eq('id', run_id)

    // Record audit log entry
    AuditService.record({
      action: succeeded ? 'rule.completed' : 'rule.failed',
      category: 'rule',
      entity_type: 'workflow_rule_run',
      entity_id: run_id,
      opportunity_id: run.opportunity_id,
      application_id: run.application_id,
      actor_id: null,
      actor_role: 'automation',
      source: 'automation',
      metadata: { rule_id: run.rule_id },
    }).catch(() => {})

    // Bump success/fail counter
    try { await supabase.rpc('noop' as any, {}) } catch {} // reserved
    if (succeeded) {
      await supabase.from('workflow_rules').update({
        runs_success: (run.rule_snapshot?.runs_success || 0) + 1,
      }).eq('id', run.rule_id)
    } else {
      await supabase.from('workflow_rules').update({
        runs_failed: (run.rule_snapshot?.runs_failed || 0) + 1,
      }).eq('id', run.rule_id)
    }
  }
}

function mapEventToTrigger(eventType: string): string | null {
  const map: Record<string, string> = {
    application_submitted: 'application_submitted',
    application_withdrawn: 'application_withdrawn',
    stage_reviewing: 'stage_changed',
    stage_screening: 'stage_changed',
    stage_interviewing: 'stage_changed',
    stage_offered: 'stage_changed',
    stage_hired: 'stage_changed',
    stage_rejected: 'stage_changed',
    interview_scheduled: 'interview_scheduled',
    interview_cancelled: 'interview_cancelled',
    interview_completed: 'interview_completed',
    communication_replied: 'communication_replied',
    note_added: 'note_added',
    reviewer_assigned: 'reviewer_assigned',
  }
  return map[eventType] || null
}

function matchesTriggerFilters(cfg: any, ctx: AutomationContext): boolean {
  if (!cfg || Object.keys(cfg).length === 0) return true
  const meta = ctx.event?.metadata || {}
  if (Array.isArray(cfg.to_stage)) {
    const to = ctx.event?.to_stage || meta.to_stage
    if (!cfg.to_stage.includes(to)) return false
  }
  if (Array.isArray(cfg.from_stage)) {
    const from = ctx.event?.from_stage
    if (!cfg.from_stage.includes(from)) return false
  }
  return true
}

function computeDelayTs(config: any, ctx: AutomationContext): Date {
  const now = Date.now()
  if (config?.relative_to === 'interview.scheduled_at') {
    const iv = ctx.event?.metadata?.interview_scheduled_at
    const base = iv ? new Date(iv).getTime() : now
    const off = Number(config.offset || 0) * unitMs(config.unit || 'minutes')
    return new Date(base + off)
  }
  const ms = Number(config?.amount || 0) * unitMs(config?.unit || 'minutes')
  return new Date(now + ms)
}
function unitMs(u: string): number {
  if (u === 'minutes') return 60_000
  if (u === 'hours')   return 3_600_000
  if (u === 'days')    return 86_400_000
  return 60_000
}