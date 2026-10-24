import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/opportunities/search?q=<query>&limit=20
 * Autocomplete-style search across opportunities + categories + skills
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

  if (!q || q.length < 2) {
    return NextResponse.json({ opportunities: [], categories: [], skills: [] })
  }

  try {
    const [oppsRes, catsRes] = await Promise.all([
      // Search opportunities
      supabase.from('opportunities')
        .select('id, slug, title, subtitle, opportunity_type, status, poster_user_id, project_id, venture_id')
        .textSearch('search_vector', q, { type: 'websearch', config: 'english' })
        .eq('visibility', 'public')
        .in('status', ['active', 'closing-soon'])
        .limit(limit),
      // Search categories
      supabase.from('opportunity_categories')
        .select('id, name, slug, parent_id, icon')
        .ilike('name', '%' + q + '%')
        .eq('is_active', true)
        .limit(10),
    ])

    // Extract skills from opportunities (top matches)
    const skillCounts = new Map<string, number>()
    const opps = oppsRes.data || []
    for (const opp of opps) {
      const oppFull = await supabase.from('opportunities')
        .select('required_skills, preferred_skills').eq('id', opp.id).single()
      const allSkills = [
        ...(oppFull.data?.required_skills || []),
        ...(oppFull.data?.preferred_skills || []),
      ]
      for (const s of allSkills) {
        if (s.toLowerCase().includes(q.toLowerCase())) {
          skillCounts.set(s, (skillCounts.get(s) || 0) + 1)
        }
      }
    }

    const skills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      opportunities: opps.slice(0, limit),
      categories: catsRes.data || [],
      skills,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message, opportunities: [], categories: [], skills: [] }, { status: 500 })
  }
}