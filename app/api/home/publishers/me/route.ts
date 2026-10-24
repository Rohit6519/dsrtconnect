import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/home/publishers/me
 * Returns all identities the current user can publish as
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ publishers: [] })

  try {
    const [profileRes, ventureOwnRes, ventureTeamRes] = await Promise.all([
      supabase.from('users')
        .select('id, username, full_name, avatar_url, tagline, is_verified')
        .eq('id', user.id).single(),
      supabase.from('ventures')
        .select('id, slug, name, logo_url, tagline, is_verified')
        .or(`founder_id.eq.${user.id},user_id.eq.${user.id}`),
      supabase.from('venture_team_members')
        .select('venture_id, can_publish, is_founder, role, ventures:venture_id(id, slug, name, logo_url, tagline, is_verified)')
        .eq('user_id', user.id)
        .eq('can_publish', true),
    ])

    const publishers: any[] = []

    // Always self
    if (profileRes.data) {
      publishers.push({
        type: 'person',
        id: user.id,
        name: profileRes.data.full_name,
        handle: profileRes.data.username,
        avatar_url: profileRes.data.avatar_url,
        tagline: profileRes.data.tagline,
        is_verified: profileRes.data.is_verified,
        role: 'You',
      })
    }

    // Own ventures
    const seen = new Set<string>()
    for (const v of (ventureOwnRes.data || [])) {
      if (seen.has(v.id)) continue
      seen.add(v.id)
      publishers.push({
        type: 'venture',
        id: v.id,
        name: v.name,
        handle: v.slug,
        avatar_url: v.logo_url,
        tagline: v.tagline,
        is_verified: v.is_verified,
        role: 'Owner',
      })
    }

    // Ventures as team member with publish permission
    for (const tm of (ventureTeamRes.data || []) as any[]) {
      const v = tm.ventures
      if (!v || seen.has(v.id)) continue
      seen.add(v.id)
      publishers.push({
        type: 'venture',
        id: v.id,
        name: v.name,
        handle: v.slug,
        avatar_url: v.logo_url,
        tagline: v.tagline,
        is_verified: v.is_verified,
        role: tm.is_founder ? 'Founder' : (tm.role || 'Team member'),
      })
    }

    return NextResponse.json({ publishers })
  } catch (e: any) {
    console.error('Publishers error:', e)
    return NextResponse.json({ publishers: [], error: e?.message }, { status: 500 })
  }
}