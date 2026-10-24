import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { RequestContext } from './types'

/**
 * Pulls actor + IP + UA from a NextRequest. Every audit call should use this
 * so the log has consistent context.
 */
export async function getRequestContext(req?: NextRequest | Request | null): Promise<RequestContext> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let ip: string | null = null
  let ua: string | null = null
  let sessionId: string | null = null

  if (req) {
    const h: Headers = (req as any).headers
    if (h) {
      ip =
        h.get('x-forwarded-for')?.split(',')[0].trim() ||
        h.get('x-real-ip') ||
        h.get('cf-connecting-ip') ||
        null
      ua = h.get('user-agent') || null
      sessionId =
        h.get('x-dsrt-session') ||
        (h.get('cookie')?.match(/dsrt_sid=([^;]+)/)?.[1]) ||
        null
    }
  }

  return {
    actor_id: user?.id || null,
    actor_ip: ip,
    actor_user_agent: ua ? ua.slice(0, 500) : null,
    actor_session_id: sessionId,
  }
}