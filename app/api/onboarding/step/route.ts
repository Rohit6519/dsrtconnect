import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const VALID_STEPS = [
  'identity',
  'profile',
  'professional',
  'skills',
  'personalization',
  'security_pin',
] as const
const VALID_STATUSES = ['NOT_VISITED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `skill-${Date.now()}`
  )
}

async function resolveSkillId(
  skillName: string,
  category: string
): Promise<string | null> {
  const { data: byName } = await adminClient
    .from('skills')
    .select('id')
    .ilike('name', skillName)
    .maybeSingle()

  if (byName?.id) return byName.id

  const { data: created, error } = await adminClient
    .from('skills')
    .insert({
      name: skillName,
      slug: slugify(skillName),
      category: category.toLowerCase() || 'general',
    })
    .select('id')
    .single()

  if (error || !created?.id) {
    const { data: retry } = await adminClient
      .from('skills')
      .select('id')
      .ilike('name', skillName)
      .maybeSingle()
    return retry?.id || null
  }

  return created.id
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { step, status, data } = body

    if (!VALID_STEPS.includes(step)) {
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Persist step-specific data (security_pin carries no profile fields)
    if (data && typeof data === 'object') {
      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      }

      if (step === 'profile') {
        if (data.display_name) {
          updates.full_name = String(data.display_name).trim()
        }
        if (data.avatar_url !== undefined) {
          updates.avatar_url = data.avatar_url
        }
        if (data.avatar_status) {
          updates.avatar_status = data.avatar_status
        }
        if (data.location_data !== undefined) {
          updates.location_data = data.location_data
          if (data.location_data?.display_name) {
            updates.location = data.location_data.display_name
          }
        }
      } else if (step === 'professional') {
        if (Array.isArray(data.professional_roles)) {
          updates.professional_roles = data.professional_roles
        }
      } else if (step === 'skills') {
        if (status === 'SKIPPED') {
          // keep existing skills
        } else if (Array.isArray(data.skills)) {
          await adminClient.from('user_skills').delete().eq('user_id', user.id)

          for (const skill of data.skills) {
            const skillName = String(
              skill.canonical_name || skill.name || ''
            ).trim()
            if (!skillName) continue

            const category = String(
              skill.category ||
                (String(skill.id || '').startsWith('custom_')
                  ? 'custom'
                  : 'general')
            )

            const skillId = await resolveSkillId(skillName, category)
            if (!skillId) continue

            await adminClient.from('user_skills').insert({
              user_id: user.id,
              skill_id: skillId,
              level: 'intermediate',
            })
          }
        }
      } else if (step === 'personalization') {
        if (Array.isArray(data.goals)) {
          updates.goals = data.goals
        }
        if (Array.isArray(data.interest_topics)) {
          updates.interest_topics = data.interest_topics
        }
        if (data.building_status) {
          updates.building_status = data.building_status
        }
        if (data.building_intent !== undefined) {
          updates.building_intent = data.building_intent || {}
        }
      }
      // step === 'security_pin' → no profile fields, only state advance below

      if (Object.keys(updates).length > 1) {
        const { error: updateError } = await adminClient
          .from('users')
          .update(updates)
          .eq('id', user.id)

        if (updateError) {
          console.error('[onboarding/step] user update error:', updateError)
          return NextResponse.json(
            { error: 'Failed to save profile data', details: updateError.message },
            { status: 500 }
          )
        }
      }
    }

    const { data: rpcResult, error: rpcError } = await adminClient.rpc(
      'update_onboarding_step',
      {
        p_user_id: user.id,
        p_step: step,
        p_status: status,
      }
    )

    if (rpcError) {
      return NextResponse.json(
        { error: 'Failed to update state', details: rpcError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      onboarding_state: rpcResult?.onboarding_state,
      step_states: rpcResult?.step_states,
    })
  } catch (err: any) {
    console.error('[onboarding/step]', err)
    return NextResponse.json(
      { error: err.message || 'Internal error' },
      { status: 500 }
    )
  }
}