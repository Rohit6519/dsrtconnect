import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_ACTIONS = ['dismiss','interested','not_interested','click']

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ success: false })

  try {
    const body = await request.json()
    const action = VALID_ACTIONS.includes(body.action) ? body.action : 'click'

    const { data: venture } = await supabase
      .from('ventures')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!venture) return NextResponse.json({ success: false })

    // Update seen items
    await supabase
      .from('user_seen_items')
      .upsert({
        user_id: user.id,
        entity_type: 'venture',
        entity_id: venture.id,
        seen_at: new Date().toISOString(),
        interacted: action !== 'dismiss' && action !== 'not_interested',
      }, { onConflict: 'user_id,entity_type,entity_id' })

    // Weight based on action
    const weights: Record<string, number> = {
      dismiss: -2.0,
      not_interested: -3.0,
      interested: 2.0,
      click: 1.0,
    }

    await supabase.from('user_activity_signals').insert({
      user_id: user.id,
      signal_type: action,
      entity_type: 'venture',
      entity_id: venture.id,
      weight: weights[action] || 0,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false })
  }
}
