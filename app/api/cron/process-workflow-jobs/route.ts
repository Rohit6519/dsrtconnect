import { NextRequest, NextResponse } from 'next/server'
import { JobQueue } from '@/lib/applications/JobQueue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const secret = process.env.CRON_SECRET || 'dsrt_cron_2025_secure_key'

  const urlParams = new URL(req.url).searchParams
  const querySecret = urlParams.get('secret') || urlParams.get('token')

  const ok =
    isVercelCron ||
    (secret && header === `Bearer ${secret}`) ||
    (secret && querySecret === secret)

  if (!ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await JobQueue.processBatch()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[cron:process-workflow-jobs] failed', e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}