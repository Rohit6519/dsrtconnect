import { createClient } from '@/lib/supabase/server'
import { RedactionService } from './RedactionService'
import { AuditService } from './AuditService'

/**
 * Assembles a GDPR-style bundle for one of:
 *   scope='opportunity'  → everything under an opportunity
 *   scope='application'  → everything under an application (candidate or manager)
 *   scope='user_self'    → the requester's own data across DSRT
 *
 * Results are stored as JSON/CSV in the export bucket. Small enough exports
 * are inlined into result_url as a data: URL for MVP; production would upload
 * to Supabase Storage and return a signed URL — the API layer here supports both.
 */
export class ExportService {
  static async runExport(request_id: string) {
    const supabase = await createClient()
    const { data: req } = await supabase.from('compliance_export_requests').select('*').eq('id', request_id).single()
    if (!req) throw new Error('export request not found')
    if (req.status !== 'queued') return

    await supabase.from('compliance_export_requests').update({
      status: 'running',
    }).eq('id', request_id)

    try {
      const bundle = await this.buildBundle(req)
      const redacted = RedactionService.redact(bundle, {
        include_pii: req.include_pii,
        keep_internal: false,
      })

      const format = req.format || 'json'
      const filename = `dsrt-export-${req.scope}-${req.entity_id?.slice(0, 8) || req.requested_by.slice(0, 8)}-${Date.now()}.${format}`
      const payload = format === 'csv' ? toCsv(redacted) : JSON.stringify(redacted, null, 2)
      const bytes = Buffer.byteLength(payload, 'utf8')

      // Upload to Supabase Storage bucket `compliance-exports`
      const path = `${req.requested_by}/${filename}`
      const { data: up, error: upErr } = await supabase.storage
        .from('compliance-exports')
        .upload(path, payload, {
          contentType: format === 'csv' ? 'text/csv' : 'application/json',
          upsert: true,
        })
      if (upErr) throw upErr

      const { data: signed } = await supabase.storage
        .from('compliance-exports')
        .createSignedUrl(up.path, 60 * 60 * 24 * 7) // 7 days

      const expires = new Date(Date.now() + 7 * 86400_000).toISOString()

      await supabase.from('compliance_export_requests').update({
        status: 'ready',
        result_url: signed?.signedUrl || null,
        result_bytes: bytes,
        row_counts: bundle._counts || {},
        finished_at: new Date().toISOString(),
        expires_at: expires,
      }).eq('id', request_id)

      await AuditService.record({
        action: 'compliance.export_ready',
        category: 'compliance',
        entity_type: 'export_request',
        entity_id: request_id,
        actor_id: req.requested_by,
        actor_role: 'system',
        source: 'cron',
        opportunity_id: req.scope === 'opportunity' ? req.entity_id : null,
        application_id: req.scope === 'application' ? req.entity_id : null,
        metadata: { format, bytes, counts: bundle._counts },
      })
    } catch (e: any) {
      await supabase.from('compliance_export_requests').update({
        status: 'failed',
        error: (e?.message || String(e)).slice(0, 500),
        finished_at: new Date().toISOString(),
      }).eq('id', request_id)
      throw e
    }
  }

  private static async buildBundle(req: any) {
    const supabase = await createClient()
    const counts: Record<string, number> = {}
    const bundle: any = { _meta: { generated_at: new Date().toISOString(), scope: req.scope } }

    if (req.scope === 'opportunity') {
      const opp_id = req.entity_id
      const [opp, apps, ivs, mails, events, notes, rules, ruleRuns, audit] = await Promise.all([
        supabase.from('opportunities').select('*').eq('id', opp_id).single(),
        supabase.from('opportunity_applications').select('*').eq('opportunity_id', opp_id),
        supabase.from('interviews').select('*').eq('opportunity_id', opp_id),
        req.include_messages ? supabase.from('application_communications').select('*').eq('opportunity_id', opp_id) : Promise.resolve({ data: [] }),
        supabase.from('application_workflow_events').select('*').eq('opportunity_id', opp_id),
        supabase.from('application_internal_notes').select('*').eq('opportunity_id', opp_id),
        supabase.from('workflow_rules').select('*').eq('opportunity_id', opp_id),
        supabase.from('workflow_rule_runs').select('*').eq('opportunity_id', opp_id),
        req.include_audit ? supabase.from('compliance_audit_log').select('*').eq('opportunity_id', opp_id) : Promise.resolve({ data: [] }),
      ])
      bundle.opportunity = opp.data
      bundle.applications = apps.data || []
      bundle.interviews = ivs.data || []
      bundle.messages = (mails as any).data || []
      bundle.workflow_events = events.data || []
      bundle.internal_notes = notes.data || []
      bundle.automation_rules = rules.data || []
      bundle.automation_runs = ruleRuns.data || []
      bundle.audit_log = (audit as any).data || []
      counts.applications = bundle.applications.length
      counts.interviews = bundle.interviews.length
      counts.messages = bundle.messages.length
      counts.events = bundle.workflow_events.length
      counts.audit = bundle.audit_log.length
    }

    if (req.scope === 'application') {
      const app_id = req.entity_id
      const [app, ivs, mails, events, notes, audit] = await Promise.all([
        supabase.from('opportunity_applications').select('*').eq('id', app_id).single(),
        supabase.from('interviews').select('*').eq('application_id', app_id),
        req.include_messages ? supabase.from('application_communications').select('*').eq('application_id', app_id) : Promise.resolve({ data: [] }),
        supabase.from('application_workflow_events').select('*').eq('application_id', app_id),
        supabase.from('application_internal_notes').select('*').eq('application_id', app_id),
        req.include_audit ? supabase.from('compliance_audit_log').select('*').eq('application_id', app_id) : Promise.resolve({ data: [] }),
      ])
      bundle.application = app.data
      bundle.interviews = ivs.data || []
      bundle.messages = (mails as any).data || []
      bundle.workflow_events = events.data || []
      bundle.internal_notes = notes.data || []
      bundle.audit_log = (audit as any).data || []
      counts.interviews = bundle.interviews.length
      counts.messages = bundle.messages.length
      counts.events = bundle.workflow_events.length
      counts.audit = bundle.audit_log.length
    }

    if (req.scope === 'user_self') {
      const user_id = req.requested_by
      const [profile, apps, mails, events, audit] = await Promise.all([
        supabase.from('users').select('*').eq('id', user_id).maybeSingle(),
        supabase.from('opportunity_applications').select('*').eq('applicant_id', user_id),
        req.include_messages ? supabase.from('inbox_messages').select('*').eq('recipient_id', user_id) : Promise.resolve({ data: [] }),
        supabase.from('application_workflow_events').select('*').eq('actor_id', user_id),
        req.include_audit ? supabase.from('compliance_audit_log').select('*').eq('actor_id', user_id) : Promise.resolve({ data: [] }),
      ])
      bundle.profile = profile.data
      bundle.applications = apps.data || []
      bundle.messages = (mails as any).data || []
      bundle.workflow_events = events.data || []
      bundle.audit_log = (audit as any).data || []
      counts.applications = bundle.applications.length
      counts.messages = bundle.messages.length
      counts.events = bundle.workflow_events.length
      counts.audit = bundle.audit_log.length
    }

    bundle._counts = counts
    return bundle
  }
}

function toCsv(obj: any): string {
  // Flat CSV export: dumps every collection as its own section (simple + human-readable)
  const lines: string[] = []
  for (const [section, value] of Object.entries(obj)) {
    if (section.startsWith('_')) continue
    if (!Array.isArray(value)) continue
    lines.push(`# ${section}`)
    if (value.length === 0) { lines.push(''); continue }
    const headers = Array.from(new Set(value.flatMap((v: any) => Object.keys(v))))
    lines.push(headers.join(','))
    for (const row of value) {
      lines.push(headers.map(h => csvCell(row[h])).join(','))
    }
    lines.push('')
  }
  return lines.join('\n')
}

function csvCell(v: any): string {
  if (v == null) return ''
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return `"${s.replace(/"/g, '""')}"`
}