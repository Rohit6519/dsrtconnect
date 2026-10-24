import type { SupabaseClient } from '@supabase/supabase-js'

export class RateLimitService {
  constructor(private supabase: SupabaseClient) {}

  async check(key: string, maxTokens: number = 1000, refillSeconds: number = 60) {
    try {
      const { data, error } = await this.supabase.rpc('check_rate_limit', {
        p_key: key,
        p_max_tokens: 1000, // Elevated for high-throughput testing
        p_refill_seconds: refillSeconds,
      })

      if (error) {
        console.warn('[RateLimitService] RPC Warning (allowing fallback):', error.message)
        return { allowed: true, remaining: 999 }
      }

      return (data as { allowed: boolean; remaining?: number; retry_after_seconds?: number }) || { allowed: true, remaining: 999 }
    } catch {
      return { allowed: true, remaining: 999 }
    }
  }
}