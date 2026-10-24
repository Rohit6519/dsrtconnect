import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_investor, focus_sectors, check_size')
    .eq('id', user.id)
    .single()

  if (!profile?.is_investor) {
    // User is a founder — return matching investors
    const { data: myVenture } = await supabase
      .from('startups')
      .select('id, category, stage')
      .eq('founder_id', user.id)
      .maybeSingle()

    if (!myVenture) {
      return NextResponse.json({ items: [] })
    }

    const { data: investors } = await supabase
      .from('users')
      .select('*')
      .eq('is_investor', true)
      .eq('onboarding_complete', true)

    const scored = (investors || [])
      .map((inv: any) => {
        const sectorMatch = (myVenture.category || []).some((c: string) =>
          (inv.focus_sectors || []).includes(c)
        )
        return {
          investor: inv,
          score: sectorMatch ? 20 : 0,
          reason: sectorMatch
            ? `Invests in ${myVenture.category?.[0]}`
            : 'General fit',
        }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    return NextResponse.json({ role: 'founder', items: scored })
  }

  // User is investor — return matching founders
  const { data: ventures } = await supabase
    .from('startups')
    .select('*, users:founder_id(id, full_name, username, avatar_url, tagline)')
    .neq('founder_id', user.id)

  const scored = (ventures || [])
    .map((v: any) => {
      const sectorMatch = (v.category || []).some((c: string) =>
        (profile.focus_sectors || []).includes(c)
      )
      let score = 0
      const reasons: string[] = []
      if (sectorMatch) {
        score += 25
        reasons.push('Matches your focus')
      }
      if (['idea', 'building', 'mvp'].includes(v.stage)) {
        score += 10
        reasons.push('Early stage')
      }
      if (v.is_verified) score += 5

      return { venture: v, score, reasons }
    })
    .filter((v) => v.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)

  return NextResponse.json({ role: 'investor', items: scored })
}