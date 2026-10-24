import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Signal weights that drive the personalization algorithm
const SIGNAL_WEIGHTS: Record<string, number> = {
  view_post: 0.3,
  view_post_deep: 1.5,      // dwelled > 5s
  like_post: 3.0,
  comment_post: 5.0,
  bookmark_post: 4.0,
  share_post: 2.5,
  click_profile: 2.0,
  view_profile: 1.0,
  click_project: 2.5,
  view_project: 1.5,
  click_venture: 2.5,
  view_venture: 1.5,
  click_skill: 2.0,
  click_category: 2.0,
  click_community: 3.0,
  connect_request: 4.0,
  search: 1.5,
  filter_apply: 1.0,
  scroll_deep: 0.5,
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: true })

  const body = await request.json()
  const {
    signal_type,
    entity_type,
    entity_id,
    dwell_ms,
    session_id,
    topics,  // array of tags/skills/sector to boost affinity
    metadata,
  } = body

  if (!signal_type) return NextResponse.json({ error: 'Missing signal_type' }, { status: 400 })

  const weight = SIGNAL_WEIGHTS[signal_type] || 1.0

  // Insert raw signal
  await supabase.from('user_activity_signals').insert({
    user_id: user.id,
    signal_type,
    entity_type: entity_type || null,
    entity_id: entity_id || null,
    weight,
    dwell_ms: dwell_ms || null,
    session_id: session_id || null,
    metadata: metadata || {},
  })

  // Boost topic affinity (this is what makes it adaptive like YouTube/IG)
  if (Array.isArray(topics) && topics.length > 0) {
    await supabase.rpc('boost_topic_affinity', {
      p_user_id: user.id,
      p_topics: topics,
      p_delta: weight,
    })
  }

  return NextResponse.json({ ok: true })
}