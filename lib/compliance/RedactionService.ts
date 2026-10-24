/**
 * Applies redaction to arbitrary export payloads. Keeps structure,
 * removes PII when include_pii=false, and always masks internal-only fields.
 */
const INTERNAL_KEYS = new Set([
  'private_notes',
  'internal_notes',
  'reviewer_notes',
  'internal_rating',
  'password',
  'password_hash',
  'pin_hash',
  'ip_address',
  'actor_ip',
  'user_agent',
  'actor_user_agent',
])

const PII_KEYS = new Set([
  'email',
  'phone',
  'phone_number',
  'address',
  'location',
  'ip_address',
  'actor_ip',
  'full_name',
  'first_name',
  'last_name',
  'date_of_birth',
])

export class RedactionService {
  static redact(payload: any, opts: { include_pii: boolean; keep_internal?: boolean }): any {
    return walk(payload, opts)
  }
}

function walk(val: any, opts: { include_pii: boolean; keep_internal?: boolean }): any {
  if (val == null) return val
  if (Array.isArray(val)) return val.map((v) => walk(v, opts))
  if (typeof val === 'object') {
    const out: any = {}
    for (const [k, v] of Object.entries(val)) {
      if (!opts.keep_internal && INTERNAL_KEYS.has(k)) {
        out[k] = '[REDACTED_INTERNAL]'
        continue
      }
      if (!opts.include_pii && PII_KEYS.has(k)) {
        out[k] = '[REDACTED_PII]'
        continue
      }
      out[k] = walk(v, opts)
    }
    return out
  }
  return val
}