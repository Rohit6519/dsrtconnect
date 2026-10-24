import { createClient } from '@/lib/supabase/server'
import type { AuditInput } from './types'

/**
 * The only place that writes to compliance_audit_log.
 * Guarantees canonical shape + safe fallbacks (never throws — audit failure
 * must not break business logic).
 */
export class AuditService {
  static async record(input: AuditInput): Promise<{ id: string | null; ok: boolean }> {
    try {
      const supabase = await createClient()
      const row = {
        action: input.action,
        category: input.category,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        opportunity_id: input.opportunity_id ?? null,
        application_id: input.application_id ?? null,
        organization_id: input.organization_id ?? null,
        actor_id: input.actor_id ?? null,
        actor_role: input.actor_role ?? (input.actor_id ? 'owner' : 'system'),
        actor_ip: input.actor_ip ?? null,
        actor_user_agent: input.actor_user_agent ?? null,
        actor_session_id: input.actor_session_id ?? null,
        reason: input.reason ?? null,
        source: input.source ?? 'api',
        before_state: input.before_state ?? null,
        after_state: input.after_state ?? null,
        diff: input.diff ?? computeDiff(input.before_state, input.after_state),
        metadata: input.metadata ?? {},
      }
      const { data, error } = await supabase
        .from('compliance_audit_log')
        .insert(row)
        .select('id')
        .single()
      if (error) {
        console.error('[audit] insert failed', error)
        return { id: null, ok: false }
      }
      return { id: data.id, ok: true }
    } catch (e: any) {
      console.error('[audit] threw', e)
      return { id: null, ok: false }
    }
  }
}

function computeDiff(before: any, after: any): any {
  if (!before || !after) return null
  try {
    const diff: Record<string, { from: any; to: any }> = {}
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const k of keys) {
      const a = (before as any)[k]
      const b = (after as any)[k]
      if (JSON.stringify(a) !== JSON.stringify(b)) diff[k] = { from: a, to: b }
    }
    return Object.keys(diff).length ? diff : null
  } catch {
    return null
  }
}