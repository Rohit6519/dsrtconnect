import { NextResponse } from 'next/server'
import { EmailDispatchService } from '@/lib/email/EmailDispatchService'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await EmailDispatchService.processBatch(25)
  return NextResponse.json({
    processed_at: new Date().toISOString(),
    ...result
  })
}