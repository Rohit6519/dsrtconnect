import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret') || request.headers.get('authorization')?.replace('Bearer ', '')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: count, error } = await adminClient.rpc('process_account_deletions')
    if (error) throw error

    return NextResponse.json({
      success: true,
      processed: count || 0,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to process deletions', details: err.message }, { status: 500 })
  }
}