import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error } = await adminClient
      .from('users')
      .select(`
        id, email, username, normalized_username, full_name, avatar_url, avatar_status,
        tagline, location, location_data, professional_roles, goals, interest_topics,
        building_status, building_intent, onboarding_state, onboarding_step_states,
        onboarding_complete, pin_configured, trust_level, trust_score, email_verification_status
      `)
      .eq('id', user.id)
      .single()

    if (error || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: userSkills } = await adminClient
      .from('user_skills')
      .select(`skill_id, skills:skill_id (id, name, category)`)
      .eq('user_id', user.id)

    return NextResponse.json({
      onboarding_state: profile.onboarding_state || 'IDENTITY',
      step_states: profile.onboarding_step_states || {
        identity: 'NOT_VISITED',
        profile: 'NOT_VISITED',
        professional: 'NOT_VISITED',
        skills: 'NOT_VISITED',
        personalization: 'NOT_VISITED',
        security_pin: 'NOT_VISITED',
      },
      profile: {
        ...profile,
        skills: userSkills || [],
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}