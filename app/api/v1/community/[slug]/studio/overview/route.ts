// ============================================================
// app/api/v1/community/[slug]/studio/overview/route.ts
// Studio command-center overview.
//
// FIXED:
//   - 15s stale-while-revalidate cache per (communityId, actorId)
//   - Serves cached response instantly; kicks off async refresh in background
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { getStudioOverview } from '@/lib/community/service.studio'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// -----------------------------------------------------------
// Simple in-memory SWR cache
// -----------------------------------------------------------

interface CacheEntry {
  data: any
  ts: number
  refreshing: boolean
}

const TTL_MS = 15_000
const cache = new Map<string, CacheEntry>()

function cacheKey(communityId: string, actorId: string) {
  return `${communityId}::${actorId}`
}

function getFromCache(key: string): CacheEntry | null {
  const e = cache.get(key)
  if (!e) return null
  return e
}

function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now(), refreshing: false })
}

async function refreshInBackground(key: string, supabase: any, actorId: string, communityId: string) {
  const entry = cache.get(key)
  if (entry) entry.refreshing = true
  try {
    const fresh = await getStudioOverview(supabase, actorId, communityId)
    setCache(key, fresh)
  } catch (e: any) {
    // Preserve stale data; just clear refreshing flag
    if (entry) entry.refreshing = false
    console.warn('[studio:overview_refresh_failed]', e?.message)
  }
}

// -----------------------------------------------------------
// Handler
// -----------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const key = cacheKey(community.id, ctx.identityId)
    const entry = getFromCache(key)
    const now = Date.now()

    // Fresh: return cache directly
    if (entry && now - entry.ts < TTL_MS) {
      return ok(entry.data, { ctx })
    }

    // Stale: return stale, revalidate in background
    if (entry && !entry.refreshing) {
      refreshInBackground(key, supabase, ctx.identityId, community.id).catch(() => {})
      return ok(entry.data, { ctx })
    }

    // No entry: block-fetch fresh
    const fresh = await getStudioOverview(supabase, ctx.identityId, community.id)
    setCache(key, fresh)
    return ok(fresh, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}