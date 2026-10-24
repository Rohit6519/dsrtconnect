import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Query ventures owned by user (via user_id or founder_id)
    const { data: ventures, error } = await supabase
      .from('ventures')
      .select(`
        id, slug, name, tagline, description, industry, stage, location, 
        logo_url, cover_url, status, is_draft, profile_completion, 
        updated_at, created_at, follower_count
      `)
      .or(`user_id.eq.${user.id},founder_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Fetch team counts for enriched summary
    const ventureIds = (ventures || []).map(v => v.id)
    let teamCounts: Record<string, number> = {}

    if (ventureIds.length > 0) {
      const { data: memberships } = await supabase
        .from('venture_team_memberships')
        .select('venture_id')
        .in('venture_id', ventureIds)
        .eq('status', 'active')

      if (memberships) {
        memberships.forEach(m => {
          teamCounts[m.venture_id] = (teamCounts[m.venture_id] || 0) + 1
        })
      }
    }

    const enriched = (ventures || []).map(v => ({
      ...v,
      team_count: teamCounts[v.id] || 1,
    }))

    return NextResponse.json({ ventures: enriched })
  } catch (e: any) {
    console.error('Fetch my ventures error:', e)
    return NextResponse.json({ error: e?.message || 'Failed to fetch ventures' }, { status: 500 })
  }
}