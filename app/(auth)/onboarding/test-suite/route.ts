import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: Record<string, { status: 'PASS' | 'FAIL'; details?: any }> = {}
  const testEmail = `onboard_v2_test_${Date.now()}@dsrtai.com`
  const testUsername = `v2user_${Math.floor(1000 + Math.random() * 9000)}`
  let testUserId: string | null = null

  try {
    // 1. Create Test User
    const { data: userCreated, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: { full_name: 'V2 Test User' }
    })

    if (userErr || !userCreated.user) {
      results['1_Test_User_Creation'] = { status: 'FAIL', details: userErr?.message }
    } else {
      testUserId = userCreated.user.id
      results['1_Test_User_Creation'] = { status: 'PASS', details: { id: testUserId } }
    }

    // 2. Test Identity Step (Atomic Claim)
    if (testUserId) {
      const { data: claimData, error: claimErr } = await adminClient.rpc('claim_dsrt_identity', {
        p_user_id: testUserId,
        p_username: testUsername
      })

      results['2_Step1_Identity_Claim'] = {
        status: !claimErr && claimData?.success ? 'PASS' : 'FAIL',
        details: claimData || claimErr?.message
      }
    }

    // 3. Test Step 2: Profile Update
    if (testUserId) {
      const { data: profileStep, error: step2Err } = await adminClient.rpc('update_onboarding_step', {
        p_user_id: testUserId,
        p_step: 'profile',
        p_status: 'COMPLETED'
      })

      results['3_Step2_Profile_Progress'] = {
        status: !step2Err && profileStep?.onboarding_state === 'PROFESSIONAL' ? 'PASS' : 'FAIL',
        details: profileStep
      }
    }

    // 4. Test Step 3: Professional Roles Update
    if (testUserId) {
      await adminClient.from('users').update({
        professional_roles: ['Founder', 'Software Engineer']
      }).eq('id', testUserId)

      const { data: step3Res, error: step3Err } = await adminClient.rpc('update_onboarding_step', {
        p_user_id: testUserId,
        p_step: 'professional',
        p_status: 'COMPLETED'
      })

      results['4_Step3_Professional_Roles'] = {
        status: !step3Err && step3Res?.onboarding_state === 'SKILLS' ? 'PASS' : 'FAIL',
        details: step3Res
      }
    }

    // 5. Test Step 4: Skills Step (Test Skip capability)
    if (testUserId) {
      const { data: step4Res, error: step4Err } = await adminClient.rpc('update_onboarding_step', {
        p_user_id: testUserId,
        p_step: 'skills',
        p_status: 'SKIPPED'
      })

      results['5_Step4_Skills_Skipped'] = {
        status: !step4Err && step4Res?.onboarding_state === 'PERSONALIZATION' ? 'PASS' : 'FAIL',
        details: step4Res
      }
    }

    // 6. Test Step 5: Personalization & Onboarding Finalization
    if (testUserId) {
      await adminClient.from('users').update({
        goals: ['build_projects', 'start_venture'],
        interest_topics: ['Artificial Intelligence', 'Startups', 'SaaS'],
        building_status: 'ACTIVELY_BUILDING'
      }).eq('id', testUserId)

      const { data: finalRes, error: finalErr } = await adminClient.rpc('complete_onboarding_v2', {
        p_user_id: testUserId
      })

      const { data: finalUser } = await adminClient.from('users').select('account_state, onboarding_complete').eq('id', testUserId).single()

      results['6_Step5_Finalize_Onboarding_V2'] = {
        status: !finalErr && finalUser?.account_state === 'ACTIVE' && finalUser?.onboarding_complete ? 'PASS' : 'FAIL',
        details: { rpc: finalRes, user_state: finalUser }
      }
    }

    // CLEANUP
    if (testUserId) {
      await adminClient.from('dsrt_mail_identities').delete().eq('user_id', testUserId)
      await adminClient.from('security_events').delete().eq('user_id', testUserId)
      await adminClient.from('users').delete().eq('id', testUserId)
      await adminClient.auth.admin.deleteUser(testUserId)
    }

    const allPassed = Object.values(results).every(r => r.status === 'PASS')

    return NextResponse.json({
      overall_status: allPassed ? 'ONBOARDING_V2_OPERATIONAL' : 'ISSUES_DETECTED',
      results
    }, { status: allPassed ? 200 : 500 })

  } catch (err: any) {
    if (testUserId) {
      await adminClient.from('users').delete().eq('id', testUserId)
      await adminClient.auth.admin.deleteUser(testUserId)
    }
    return NextResponse.json({ error: err.message, partial_results: results }, { status: 500 })
  }
}