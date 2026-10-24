// ============================================================
// app/api/coco/cron/cleanup/route.ts
// Deletes unpinned conversations older than 48h.
// Hobby-safe: runs once daily via Vercel Cron.
// Auth: ?secret=CRON_SECRET (matches other DSRT crons)
// ============================================================

import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const url = new URL(req.url)
  const secret = url.searchParams.get('secret') || url.searchParams.get('token')
  if (secret && secret === cronSecret) return true

  // Also accept Bearer for manual/admin triggers
  const authHeader = req.headers.get('authorization')
  if (authHeader === `Bearer ${cronSecret}`) return true

  return false
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await adminClient.rpc('coco_cleanup_old_conversations')
    if (error) throw error

    return NextResponse.json({
      ok: true,
      deleted: data ?? 0,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[COCO Cron] cleanup failed:', err?.message)
    return NextResponse.json(
      { error: err?.message || 'cleanup_failed' },
      { status: 500 }
    )
  }
}

// Allow POST too (some cron runners / manual tests)
export async function POST(req: Request) {
  return GET(req)
}