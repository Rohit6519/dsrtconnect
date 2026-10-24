import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json().catch(() => ({}))
  try {
    await supabase.from('post_views').insert({ post_id: id, viewer_id: user?.id || null, session_id: body.session_id || null, source: body.source || 'feed', dwell_ms: body.dwell_ms || null, referrer_url: body.referrer_url || null, device_type: body.device_type || null }).then(() => {}, () => {})
    const { data: cur } = await supabase.from('posts').select('view_count').eq('id', id).single()
    if (cur) await supabase.from('posts').update({ view_count: (cur.view_count || 0) + 1 }).eq('id', id).then(() => {}, () => {})
    if (user) { await supabase.from('user_seen_posts').upsert({ user_id: user.id, post_id: id, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,post_id' }).then(() => {}, () => {}) }
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }) }
}