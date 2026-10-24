import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const projectId = body?.project_id
    const reason = body?.reason || 'not_interested'

    if (!projectId) {
      return NextResponse.json({ error: 'project_id required' }, { status: 400 })
    }

    // Mark as seen with interacted=false to suppress in future recs
    const { error: seenError } = await supabase
      .from('user_seen_items')
      .upsert({
        user_id: user.id,
        entity_type: 'project',
        entity_id: projectId,
        seen_at: new Date().toISOString(),
        interacted: false,
      }, { onConflict: 'user_id,entity_type,entity_id' })

    if (seenError) throw seenError

    // Track negative signal
    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: 'dismiss',
      entity_type: 'project',
      entity_id: projectId,
      weight: -2.0,
      metadata: { reason },
    })

    return NextResponse.json({ dismissed: true })
  } catch (error: any) {
    console.error('Dismiss error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to dismiss' },
      { status: 500 }
    )
  }
}
