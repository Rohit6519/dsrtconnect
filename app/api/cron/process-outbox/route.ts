import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  // Fetch pending events
  const { data: events } = await supabase
    .from('event_outbox')
    .select('*')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(25)

  if (!events || events.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  let processedCount = 0

  for (const evt of events) {
    try {
      // Mark Processing
      await supabase.from('event_outbox').update({ status: 'PROCESSING' }).eq('id', evt.id)

      // Event Fan-out Handlers
      if (evt.event_type === 'USERNAME_CLAIMED') {
        // Additional async hooks (analytics, profile sync, search indexing)
      }

      // Mark Processed
      await supabase.from('event_outbox').update({
        status: 'PROCESSED',
        processed_at: new Date().toISOString()
      }).eq('id', evt.id)

      processedCount++
    } catch (err: any) {
      await supabase.from('event_outbox').update({
        status: 'FAILED',
        last_error: err.message,
        attempt_count: evt.attempt_count + 1
      }).eq('id', evt.id)
    }
  }

  return NextResponse.json({ processed: processedCount })
}