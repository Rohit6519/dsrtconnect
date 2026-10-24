import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ leaders: [] })

  // Get org members with their execution_score, joined with primary community they lead/belong
  const { data: members } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      users:user_id (
        id, full_name, username, avatar_url, tagline, execution_score, follower_count, products_shipped
      )
    `)
    .eq('organization_id', org.id)
    .eq('status', 'active')
    .limit(200)

  const scored = (members || [])
    .filter((m: any) => m.users)
    .map((m: any) => {
      const u = m.users
      const score = (u.execution_score || 0) * 3 + (u.follower_count || 0) * 2 + (u.products_shipped || 0) * 10
      return {
        id: u.id,
        full_name: u.full_name,
        username: u.username,
        avatar_url: u.avatar_url,
        tagline: u.tagline,
        points: score,
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)

  // Get their primary community label
  if (scored.length > 0) {
    const userIds = scored.map(s => s.id)
    const { data: comms } = await supabase
      .from('community_members')
      .select('user_id, communities:community_id (id, name, slug, institution_id)')
      .in('user_id', userIds)

    const commMap = new Map<string, string>()
    ;(comms || []).forEach((c: any) => {
      if (c.communities?.name && !commMap.has(c.user_id)) {
        commMap.set(c.user_id, c.communities.name)
      }
    })

    scored.forEach((s: any) => {
      s.community_name = commMap.get(s.id) || 'IIT Delhi'
    })
  }

  return NextResponse.json({ leaders: scored })
}