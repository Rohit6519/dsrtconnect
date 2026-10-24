import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: org } = await supabase.from('organizations').select('id').eq('slug', params.slug).single()
  if (!org) return NextResponse.json({ communities: [] })

  const { data: links } = await supabase
    .from('organization_communities')
    .select(`
      is_official, position,
      communities:community_id (
        id, name, slug, description, member_count, category, icon, icon_color, cover_url, is_verified
      )
    `)
    .eq('organization_id', org.id)
    .order('position', { ascending: true })
    .limit(50)

  const communities = (links || []).map((l: any) => ({
    ...l.communities,
    is_official: l.is_official,
    position: l.position,
  }))

  // Check which the user has joined
  if (user && communities.length > 0) {
    const ids = communities.map((c: any) => c.id)
    const { data: mine } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id)
      .in('community_id', ids)
    const joined = new Set((mine || []).map(m => m.community_id))
    communities.forEach((c: any) => { c.is_joined = joined.has(c.id) })
  }

  return NextResponse.json({ communities })
}