import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Clean expired challenges older than 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  
  await Promise.all([
    supabase.from('email_verification_challenges').delete().lt('expires_at', yesterday),
    supabase.from('username_reservations').delete().lt('expires_at', new Date().toISOString())
  ])

  return NextResponse.json({ success: true })
}