import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RateLimitOptions {
  endpoint: string
  maxRequests?: number
  windowSeconds?: number
}

/**
 * Server-side rate limiter using Supabase RPC
 * Returns null if allowed, or a NextResponse (429) if rate limited
 * 
 * Usage:
 *   const limitResponse = await checkRateLimit({ endpoint: 'ai_mentor', maxRequests: 20 })
 *   if (limitResponse) return limitResponse
 */
export async function checkRateLimit(
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const {
    endpoint,
    maxRequests = 60,
    windowSeconds = 60,
  } = options

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: allowed, error } = await supabase.rpc('check_rate_limit', {
      p_user_id: user.id,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    })

    // If rate limit check itself fails, allow the request (fail open)
    if (error) {
      console.error('Rate limit check failed:', error)
      return null
    }

    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          details: `Max ${maxRequests} requests per ${windowSeconds} seconds`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(windowSeconds),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Window': String(windowSeconds),
          },
        }
      )
    }

    return null
  } catch (err) {
    console.error('Rate limit error:', err)
    return null // Fail open on unexpected errors
  }
}

/**
 * Alternative: IP-based rate limiting for public endpoints
 */
export async function checkIpRateLimit(
  request: Request,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const {
    endpoint,
    maxRequests = 30,
    windowSeconds = 60,
  } = options

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip')
    || 'unknown'

  // Use in-memory Map for IP-based limits (simple, resets on server restart)
  const key = `${ip}:${endpoint}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  // Get or create bucket
  let bucket = ipBuckets.get(key)
  if (!bucket || now - bucket.windowStart > windowMs) {
    bucket = { count: 0, windowStart: now }
  }

  bucket.count++
  ipBuckets.set(key, bucket)

  // Cleanup old buckets periodically
  if (ipBuckets.size > 10000) {
    for (const [k, b] of ipBuckets.entries()) {
      if (now - b.windowStart > windowMs * 2) {
        ipBuckets.delete(k)
      }
    }
  }

  if (bucket.count > maxRequests) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        details: `Max ${maxRequests} requests per ${windowSeconds} seconds`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(windowSeconds),
        },
      }
    )
  }

  return null
}

// In-memory storage for IP-based rate limiting
const ipBuckets = new Map<string, { count: number; windowStart: number }>()