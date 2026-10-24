import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/looking-for/recommendations/refresh
// Forces a full recompute for the current user. Call after profile/skills/interest changes.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Wipe stale cache
  await supabase.from('team_up_recommendations_cache')
    .delete()
    .eq('user_id', user.id)

  // Recompute
  const { data, error } = await supabase.rpc('fn_refresh_team_up_recommendations', {
    p_user_id: user.id,
    p_limit: 100,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, computed: data || 0 })
}
