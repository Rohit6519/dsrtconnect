// ============================================================
// lib/kernel/audit.ts
// Kernel Audit Logging Service.
// Dual-writes to kernel_audit_logs (new) AND legacy audit_logs.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isUuid(v: string | null | undefined): boolean {
  return typeof v === 'string' && UUID_RE.test(v)
}

export interface AuditParams {
  actorId?: string | null
  action: string
  entityType: string
  entityId: string
  scopeType?: string | null
  scopeId?: string | null
  requestId?: string | null
  traceId?: string | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  metadata?: Record<string, unknown> | null
  eventId?: string | null
}

export async function writeAudit(
  supabase: SupabaseClient,
  params: AuditParams
): Promise<void> {
  const now = new Date().toISOString()

  // 1. New kernel audit log — always accepts arbitrary entity_id (varchar)
  const kernelPromise = supabase.from('kernel_audit_logs').insert({
    event_id: params.eventId ?? null,
    actor_id: params.actorId ?? null,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    scope_type: params.scopeType ?? null,
    scope_id: params.scopeId ?? null,
    request_id: params.requestId ?? null,
    trace_id: params.traceId ?? null,
    before: params.before ?? null,
    after: params.after ?? null,
    metadata: params.metadata ?? null,
    created_at: now,
  })

  // 2. Legacy audit_logs — resource_id is UUID-typed in the existing schema,
  //    so only pass the id if it's actually a UUID. Otherwise stash it in metadata.
  const legacyResourceId = isUuid(params.entityId) ? params.entityId : null
  const legacyMetadata = legacyResourceId
    ? params.metadata ?? {}
    : {
        ...(params.metadata ?? {}),
        entity_id_raw: params.entityId,
        entity_type: params.entityType,
      }

  const legacyPromise = supabase.from('audit_logs').insert({
    user_id: params.actorId ?? null,
    actor_id: params.actorId ?? null,
    action: params.action,
    resource_type: params.entityType,
    resource_id: legacyResourceId,
    metadata: legacyMetadata,
    severity: 'info',
    created_at: now,
  })

  const [res1, res2] = await Promise.allSettled([kernelPromise, legacyPromise])

  if (res1.status === 'rejected') {
    console.error('[audit:kernel_write_failed]', res1.reason)
  }
  if (res2.status === 'rejected') {
    // Legacy write failures are non-fatal — kernel log is the source of truth.
    console.warn('[audit:legacy_write_failed]', (res2.reason as any)?.message ?? res2.reason)
  }
}