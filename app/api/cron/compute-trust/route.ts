import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: users } = await adminClient
    .from('users')
    .select('id')
    .eq('account_status', 'ACTIVE')
    .order('updated_at', { ascending: true })
    .limit(200)

  if (!users || users.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let updated = 0
  for (const u of users) {
    const { error } = await adminClient.rpc('compute_trust_score', { p_user_id: u.id })
    if (!error) updated++
  }

  return NextResponse.json({
    processed: users.length,
    updated,
    timestamp: new Date().toISOString()
  })
}