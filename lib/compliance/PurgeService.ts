import { createClient } from '@/lib/supabase/server'
import { AuditService } from './AuditService'

export class PurgeService {
  /** Runs retention rules across all defined compliance_retention_policies */
  static async purgeExpiredData(): Promise<{ total_purged: number; log: any[] }> {
    const supabase = await createClient()

    const { data: policies } = await supabase.from('compliance_retention_policies')
      .select('*').eq('auto_purge_enabled', true)

    if (!policies || policies.length === 0) return { total_purged: 0, log: [] }

    let totalPurged = 0
    const purgeLogs: any[] = []

    for (const p of policies) {
      const oppId = p.opportunity_id
      if (!oppId) continue

      // 1. Purge Old Communications
      if (p.message_retention_days > 0) {
        const cutoff = new Date(Date.now() - p.message_retention_days * 86400000).toISOString()
        const { data: deletedComms } = await supabase.from('application_communications')
          .delete().eq('opportunity_id', oppId).lt('created_at', cutoff).select('id')

        const count = deletedComms?.length || 0
        if (count > 0) {
          totalPurged += count
          const logEntry = {
            policy_id: p.id, opportunity_id: oppId, target_table: 'application_communications',
            rows_purged: count, purged_before: cutoff,
          }
          await supabase.from('retention_purge_log').insert(logEntry)
          purgeLogs.push(logEntry)
        }
      }

      // 2. Purge Old Rejected / Withdrawn Applications
      if (p.application_retention_days > 0) {
        const cutoff = new Date(Date.now() - p.application_retention_days * 86400000).toISOString()
        const { data: deletedApps } = await supabase.from('opportunity_applications')
          .delete().eq('opportunity_id', oppId)
          .in('pipeline_stage', ['rejected', 'withdrawn'])
          .lt('stage_updated_at', cutoff).select('id')

        const count = deletedApps?.length || 0
        if (count > 0) {
          totalPurged += count
          const logEntry = {
            policy_id: p.id, opportunity_id: oppId, target_table: 'opportunity_applications',
            rows_purged: count, purged_before: cutoff,
          }
          await supabase.from('retention_purge_log').insert(logEntry)
          purgeLogs.push(logEntry)
        }
      }
    }

    if (totalPurged > 0) {
      await AuditService.record({
        action: 'compliance.retention_purge_executed',
        category: 'compliance',
        entity_type: 'retention_policy',
        entity_id: 'batch',
        actor_id: null,
        actor_role: 'system',
        source: 'cron',
        metadata: { total_purged: totalPurged, logs: purgeLogs },
      })
    }

    return { total_purged: totalPurged, log: purgeLogs }
  }
}