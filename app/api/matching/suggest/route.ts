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

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'builders'
  const limit = parseInt(searchParams.get('limit') || '12')

  // Get current user's full profile
  const { data: me } = await supabase
    .from('users')
    .select(
      '*, user_skills(skill_id, skills(name, category)), user_education(institution_id, institutions(id, name))'
    )
    .eq('id', user.id)
    .single()

  if (!me) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const mySkillIds = new Set(
    (me.user_skills || []).map((s: any) => s.skill_id).filter(Boolean)
  )
  const mySkillCategories = new Set(
    (me.user_skills || [])
      .map((s: any) => s.skills?.category)
      .filter(Boolean)
  )
  const myInterests = new Set(me.interest_topics || [])
  const myInstitutionIds = new Set(
    (me.user_education || [])
      .map((e: any) => e.institution_id)
      .filter(Boolean)
  )
  const myBrings = new Set(me.brings || [])
  const mySeeking = new Set(me.seeking || [])
  const myLocation = me.location?.split(',')[0]?.trim().toLowerCase()

  if (type === 'builders') {
    // Get users already followed (to exclude)
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .eq('following_type', 'user')

    const followedIds = new Set((follows || []).map((f) => f.following_id))
    followedIds.add(user.id) // Exclude self

    // Fetch candidates
    const { data: candidates } = await supabase
      .from('users')
      .select(
        '*, user_skills(skill_id, skills(name, category)), user_education(institution_id, institutions(name))'
      )
      .eq('onboarding_complete', true)
      .not('id', 'in', `(${Array.from(followedIds).join(',') || 'null'})`)
      .limit(80)

    const scored = (candidates || [])
      .map((c: any) => {
        const theirSkillIds = new Set(
          (c.user_skills || []).map((s: any) => s.skill_id).filter(Boolean)
        )
        const theirInterests = new Set(c.interest_topics || [])
        const theirInstitutions = new Set(
          (c.user_education || [])
            .map((e: any) => e.institution_id)
            .filter(Boolean)
        )
        const theirBrings = new Set(c.brings || [])
        const theirLocation = c.location?.split(',')[0]?.trim().toLowerCase()

        let score = 0
        const reasons: string[] = []

        // 1. Same institution (STRONG signal)
        const sharedInsts = Array.from(myInstitutionIds).filter((id) =>
          theirInstitutions.has(id)
        )
        if (sharedInsts.length > 0) {
          score += 30
          reasons.push('Same institution')
        }

        // 2. Complementary roles (visionary + builder = magic)
        const complementary =
          (myBrings.has('visionary') && theirBrings.has('builder')) ||
          (myBrings.has('builder') && theirBrings.has('visionary')) ||
          (myBrings.has('visionary') && theirBrings.has('launcher')) ||
          (myBrings.has('launcher') && theirBrings.has('builder'))
        if (complementary) {
          score += 25
          reasons.push('Complementary roles')
        }

        // 3. Shared interests
        const sharedInterests = Array.from(myInterests).filter((t) =>
          theirInterests.has(t)
        )
        if (sharedInterests.length > 0) {
          score += sharedInterests.length * 8
          if (sharedInterests.length >= 2) {
            reasons.push(`${sharedInterests.length} shared interests`)
          } else {
            reasons.push(`Interested in ${sharedInterests[0]}`)
          }
        }

        // 4. Shared skills (overlap = they can work together)
        const sharedSkills = Array.from(mySkillIds).filter((id) =>
          theirSkillIds.has(id)
        )
        if (sharedSkills.length > 0) {
          score += sharedSkills.length * 5
        }

        // 5. Complementary skills (they have what you don't)
        const theirSkillCats = new Set(
          (c.user_skills || [])
            .map((s: any) => s.skills?.category)
            .filter(Boolean)
        )
        const complementarySkills = Array.from(theirSkillCats).filter(
          (cat) => !mySkillCategories.has(cat)
        )
        if (complementarySkills.length > 0) {
          score += complementarySkills.length * 4
          reasons.push(`${complementarySkills[0]} skills`)
        }

        // 6. They are seeking what you bring
        const matchSeeking = Array.from(theirBrings).some((b) =>
          mySeeking.has(b as string)
        )
        if (matchSeeking) {
          score += 15
          reasons.push('Matches what you seek')
        }

        // 7. Same city (weak signal)
        if (myLocation && theirLocation && myLocation === theirLocation) {
          score += 8
          reasons.push('Same city')
        }

        // 8. Recently active
        if (c.last_active) {
          const daysSince =
            (Date.now() - new Date(c.last_active).getTime()) /
            (1000 * 60 * 60 * 24)
          if (daysSince < 7) score += 5
        }

        // 9. Boost verified/mentors
        if (c.is_verified) score += 3
        if (c.is_mentor) score += 5

        return {
          user: c,
          score,
          reasons: reasons.slice(0, 2),
        }
      })
      .filter((c) => c.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json({ items: scored })
  }

  if (type === 'ventures') {
    const { data: ventures } = await supabase
      .from('startups')
      .select('*, users:founder_id(id, full_name, username, avatar_url)')
      .neq('founder_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    const scored = (ventures || [])
      .map((v: any) => {
        let score = 0
        const reasons: string[] = []

        // Sector match with user's interests
        const sectorMatch = (v.category || []).some((c: string) =>
          Array.from(myInterests).some((i) =>
            c.toLowerCase().includes((i as string).toLowerCase())
          )
        )
        if (sectorMatch) {
          score += 20
          reasons.push('Matches your interests')
        }

        // Verified boost
        if (v.is_verified) {
          score += 10
          reasons.push('Verified')
        }

        // Stage relevance (early stage matches most users)
        if (['idea', 'building', 'mvp'].includes(v.stage)) score += 5

        // Active (has members)
        if (v.member_count > 1) score += 3

        // Recent
        const daysSince =
          (Date.now() - new Date(v.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
        if (daysSince < 30) score += 5

        return { venture: v, score, reasons: reasons.slice(0, 2) }
      })
      .filter((v) => v.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json({ items: scored })
  }

  if (type === 'projects') {
    const { data: projects } = await supabase
      .from('projects')
      .select('*, users:creator_id(id, full_name, username, avatar_url)')
      .eq('is_open', true)
      .neq('creator_id', user.id)
      .order('created_at', { ascending: false })
      .limit(80)

    const scored = (projects || [])
      .map((p: any) => {
        let score = 0
        const reasons: string[] = []

        const catMatch = (p.category || []).some((c: string) =>
          Array.from(myInterests).some((i) =>
            c.toLowerCase().includes((i as string).toLowerCase())
          )
        )
        if (catMatch) {
          score += 15
          reasons.push('Your interest')
        }

        // Tech stack match with user's skills
        const techMatch = (p.tech_stack || []).some((tech: string) =>
          Array.from(mySkillCategories).some(
            (cat) =>
              (cat as string).toLowerCase().includes(tech.toLowerCase()) ||
              tech.toLowerCase().includes((cat as string).toLowerCase())
          )
        )
        if (techMatch) {
          score += 20
          reasons.push('Your tech stack')
        }

        if (p.is_hiring) {
          score += 8
          reasons.push('Actively hiring')
        }

        return { project: p, score, reasons: reasons.slice(0, 2) }
      })
      .filter((p) => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json({ items: scored })
  }

  return NextResponse.json({ items: [] })
}