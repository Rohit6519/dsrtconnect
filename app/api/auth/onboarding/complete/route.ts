import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const body = await request.json()

    // 1. Finalize profile and set state to ACTIVE via database procedure
    const { data, error } = await supabase.rpc('complete_onboarding', {
      p_user_id: user.id,
      p_full_name: body.full_name || '',
      p_tagline: body.tagline || '',
      p_location: body.location || '',
      p_brings: body.brings || [],
      p_seeking: body.seeking || [],
      p_interests: body.interest_topics || [],
      p_availability: body.availability || ''
    })

    if (error) {
      console.error('[Onboarding Complete Error]:', error.message)
      return NextResponse.json({ error: 'Failed to complete profile initialization.', code: 'ONBOARDING_FAILED' }, { status: 500 })
    }

    // 2. Add education record if provided during onboarding
    if (body.institution_id || body.institution_name) {
      await supabase.from('user_education').insert({
        user_id: user.id,
        institution_id: body.institution_id || null,
        institution_name: body.institution_name || null,
        degree: body.degree || null,
        field: body.field || null,
        start_year: body.start_year || null,
        end_year: body.is_current ? null : body.end_year || null,
        is_current: body.is_current ?? false,
      })
    }

    // 3. Insert initial user skills
    if (body.skill_ids && Array.isArray(body.skill_ids) && body.skill_ids.length > 0) {
      const skillInserts = body.skill_ids.map((skillId: string) => ({
        user_id: user.id,
        skill_id: skillId,
        level: 'intermediate'
      }))
      
      await supabase.from('user_skills').insert(skillInserts).select()
    }

    return NextResponse.json({ success: true, account_state: 'ACTIVE' })
  } catch (err: any) {
    console.error('[Onboarding Exception]:', err)
    return NextResponse.json({ error: 'Internal Server Error', code: 'INTERNAL' }, { status: 500 })
  }
}