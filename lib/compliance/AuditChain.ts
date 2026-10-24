import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

/**
 * Re-computes the hash chain over a range and returns a list of tampered rows.
 * A row is considered tampered if either:
 *   - its prev_hash doesn't match the actual previous row's row_hash
 *   - re-hashing its contents doesn't reproduce its stored row_hash
 */
export interface VerifyResult {
  scanned: number
  ok: boolean
  first_bad_seq: number | null
  tampered_ids: string[]
}

const HASH_FIELDS = [
  'id', 'seq', 'actor_id', 'actor_role', 'actor_ip', 'actor_user_agent', 'actor_session_id',
  'action', 'category', 'entity_type', 'entity_id',
  'opportunity_id', 'application_id', 'organization_id',
  'reason', 'source',
  'before_state', 'after_state', 'diff', 'metadata',
  'prev_hash', 'created_at',
]

function canonicalJson(row: any): string {
  const obj: Record<string, any> = {}
  for (const k of HASH_FIELDS) obj[k] = row[k] ?? null
  return JSON.stringify(obj)
}

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex')
}

export class AuditChain {
  static async verifyRange(from_seq: number | null = null, limit = 5000): Promise<VerifyResult> {
    const supabase = await createClient()
    let q = supabase.from('compliance_audit_log').select('*').order('seq', { ascending: true }).limit(limit)
    if (from_seq !== null) q = q.gte('seq', from_seq)
    const { data: rows } = await q
    const list = rows || []

    // Need to also fetch the row immediately before, to compare its row_hash
    let previous_hash = '0'
    if (from_seq !== null && from_seq > 1) {
      const { data: prev } = await supabase
        .from('compliance_audit_log')
        .select('row_hash')
        .lt('seq', from_seq)
        .order('seq', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (prev?.row_hash) previous_hash = prev.row_hash
    }

    const tampered: string[] = []
    let firstBad: number | null = null

    for (const r of list) {
      // 1. prev_hash consistency
      if (r.prev_hash !== previous_hash) {
        tampered.push(r.id)
        if (firstBad === null) firstBad = r.seq
      }
      // 2. re-hash
      const recomputed = sha256Hex(canonicalJson({ ...r, prev_hash: r.prev_hash }))
      if (recomputed !== r.row_hash) {
        tampered.push(r.id)
        if (firstBad === null) firstBad = r.seq
      }
      previous_hash = r.row_hash
    }

    return {
      scanned: list.length,
      ok: tampered.length === 0,
      first_bad_seq: firstBad,
      tampered_ids: Array.from(new Set(tampered)),
    }
  }

  static async verifySingle(id: string): Promise<{ ok: boolean; reason?: string }> {
    const supabase = await createClient()
    const { data: row } = await supabase.from('compliance_audit_log').select('*').eq('id', id).single()
    if (!row) return { ok: false, reason: 'row not found' }
    const recomputed = sha256Hex(canonicalJson(row))
    if (recomputed !== row.row_hash) return { ok: false, reason: 'row_hash mismatch' }
    const { data: prev } = await supabase
      .from('compliance_audit_log')
      .select('row_hash')
      .lt('seq', row.seq)
      .order('seq', { ascending: false })
      .limit(1)
      .maybeSingle()
    const expectedPrev = prev?.row_hash || '0'
    if (row.prev_hash !== expectedPrev) return { ok: false, reason: 'prev_hash mismatch' }
    return { ok: true }
  }
}