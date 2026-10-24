import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch Opportunity Config
    const { data: opp } = await supabase
      .from('opportunities')
      .select(
        'title, application_deadline, time_commitment, hours_per_week, require_resume, require_portfolio, require_github, require_website, require_cover_letter'
      )
      .eq('id', id)
      .single()

    if (!opp) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // 2. Fetch Custom Questions Count
    const { count: questionsCount } = await supabase
      .from('opportunity_application_questions')
      .select('id', { count: 'exact', head: true })
      .eq('opportunity_id', id)

    // 3. Fetch User Profile (to check existing data)
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, github_url, website, profile_tags')
      .eq('id', user.id)
      .single()

    // 4. Build the Checklist
    const reqs = []
    
    // Always required by DSRT Application Studio
    reqs.push({
      label: 'DSRT Profile & Skills',
      met: !!(profile?.full_name && profile?.profile_tags && profile.profile_tags.length > 0),
    })

    if (opp.require_cover_letter) {
      reqs.push({ label: 'Intro Message / Cover Letter', met: false })
    }

    if (questionsCount && questionsCount > 0) {
      reqs.push({
        label: `${questionsCount} Custom Question${questionsCount > 1 ? 's' : ''}`,
        met: false,
      })
    }

    if (opp.require_resume) {
      reqs.push({ label: 'Resume', met: false })
    }

    if (opp.require_portfolio) {
      reqs.push({ label: 'Portfolio URL', met: !!profile?.website })
    }

    if (opp.require_github) {
      reqs.push({ label: 'GitHub Profile', met: !!profile?.github_url })
    }

    if (opp.require_website) {
      reqs.push({ label: 'Personal Website', met: !!profile?.website })
    }

    // 5. Calculate Estimated Time
    let minutes = 2 // Base time for review
    if (opp.require_cover_letter) minutes += 3
    if (questionsCount) minutes += questionsCount * 2
    if (opp.require_resume) minutes += 1

    return NextResponse.json({
      title: opp.title,
      deadline: opp.application_deadline,
      commitment: opp.hours_per_week
        ? `${opp.hours_per_week} hrs/week`
        : opp.time_commitment
          ? opp.time_commitment.replace(/-/g, ' ')
          : null,
      timeEstimate: `${minutes}–${minutes + 3} minutes`,
      requirements: reqs,
    })
  } catch (e: any) {
    console.error('Brief API error:', e)
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}