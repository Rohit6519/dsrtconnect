import { NextRequest, NextResponse } from 'next/server'
import { PurgeService } from '@/lib/compliance/PurgeService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const header = req.headers.get('authorization') || ''
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const secret = process.env.CRON_SECRET
  const ok = isVercelCron || (secret && header === `Bearer ${secret}`)

  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await PurgeService.purgeExpiredData()
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}