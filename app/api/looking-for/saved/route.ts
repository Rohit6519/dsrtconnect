import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// GET /api/looking-for/saved
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: saves, error } = await supabase.from('team_up_saves')
    .select('*').eq('user_id', user.id).order('saved_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const teamUpIds = (saves || []).filter(s => s.source_type === 'team_up').map(s => s.source_id)
  const ventureLfIds = (saves || []).filter(s => s.source_type === 'venture_lf').map(s => s.source_id)
  const projectRoleIds = (saves || []).filter(s => s.source_type === 'project_role').map(s => s.source_id)
  const userIds = (saves || []).filter(s => s.source_type === 'user').map(s => s.source_id)

  const [tuRes, vlfRes, prRes, uRes] = await Promise.all([
    teamUpIds.length ? supabase.from('team_up_unified').select('*').eq('source_type', 'team_up').in('source_id', teamUpIds) : { data: [] },
    ventureLfIds.length ? supabase.from('team_up_unified').select('*').eq('source_type', 'venture_lf').in('source_id', ventureLfIds) : { data: [] },
    projectRoleIds.length ? supabase.from('team_up_unified').select('*').eq('source_type', 'project_role').in('source_id', projectRoleIds) : { data: [] },
    userIds.length ? supabase.from('users').select('id, username, full_name, avatar_url, tagline').in('id', userIds) : { data: [] },
  ])

  const opportunityMap = new Map<string, any>()
  ;[...(tuRes.data || []), ...(vlfRes.data || []), ...(prRes.data || [])].forEach((o: any) => {
    opportunityMap.set(`${o.source_type}:${o.source_id}`, o)
  })
  const userMap = new Map((uRes.data || []).map(u => [u.id, u]))

  const enriched = (saves || []).map(s => ({
    ...s,
    data: s.source_type === 'user'
      ? userMap.get(s.source_id) || null
      : opportunityMap.get(`${s.source_type}:${s.source_id}`) || null,
  })).filter(s => s.data !== null)

  return NextResponse.json({
    saves: enriched,
    counts: {
      opportunities: enriched.filter(s => s.source_type !== 'user').length,
      people: enriched.filter(s => s.source_type === 'user').length,
    },
  })
}
