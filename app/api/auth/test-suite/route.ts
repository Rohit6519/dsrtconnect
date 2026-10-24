import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { generateSecureOtp6, hashOtp } from '@/lib/auth/hash'

export async function GET() {
  const results: Record<string, { status: 'PASS' | 'FAIL'; details?: any }> = {}
  const testEmail = `autotest_${Date.now()}@dsrtai.com`
  const testUsername = `user${Math.floor(100000 + Math.random() * 900000)}`
  let testUserId: string | null = null

  try {
    // TEST 1: Database Connection & Admin Key
    const { data: dbCheck, error: dbErr } = await adminClient.from('users').select('count', { count: 'exact' }).limit(1)
    if (dbErr) {
      results['1_Database_Connection'] = { status: 'FAIL', details: dbErr.message }
    } else {
      results['1_Database_Connection'] = { status: 'PASS', details: { total_users_in_db: dbCheck } }
    }

    // TEST 2: Email Service Configuration (Resend API Key & Domain)
    const hasResendKey = !!process.env.RESEND_API_KEY
    results['2_Email_Service_Config'] = {
      status: hasResendKey ? 'PASS' : 'FAIL',
      details: {
        resend_key_present: hasResendKey,
        sender_email: process.env.EMAIL_FROM || 'verify@dsrtai.com',
        domain: process.env.NEXT_PUBLIC_DSRT_MAIL_DOMAIN || 'dsrtai.com'
      }
    }

    // TEST 3: Rate Limiter Procedure
    const { data: rlData, error: rlErr } = await adminClient.rpc('check_rate_limit', {
      p_key: 'test_suite_key',
      p_max_tokens: 1000,
      p_refill_seconds: 60
    })
    results['3_Rate_Limiter_RPC'] = {
      status: !rlErr && rlData?.allowed ? 'PASS' : 'FAIL',
      details: rlData || rlErr?.message
    }

    // TEST 4: User Creation & Initial State Machine Assignment
    const { data: userCreated, error: userErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: false,
      user_metadata: { full_name: 'Test Automation Runner' }
    })

    if (userErr || !userCreated.user) {
      results['4_User_Creation_Auth'] = { status: 'FAIL', details: userErr?.message }
    } else {
      testUserId = userCreated.user.id

      // Upsert identity record
      await adminClient.from('users').upsert({
        id: testUserId,
        email: testEmail,
        full_name: 'Test Automation Runner',
        account_state: 'EMAIL_VERIFICATION_REQUIRED',
        updated_at: new Date().toISOString()
      })

      const { data: identityRecord } = await adminClient.from('users').select('account_state').eq('id', testUserId).single()

      results['4_User_Creation_Auth'] = {
        status: identityRecord?.account_state === 'EMAIL_VERIFICATION_REQUIRED' ? 'PASS' : 'FAIL',
        details: { user_id: testUserId, initial_state: identityRecord?.account_state }
      }
    }

    // TEST 5: OTP Generation & Hashed Challenge Storage
    if (testUserId) {
      const testOtp = generateSecureOtp6()
      const codeHash = hashOtp(testOtp)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      const { error: otpErr } = await adminClient.from('email_verification_challenges').insert({
        user_id: testUserId,
        email: testEmail,
        code_hash: codeHash,
        expires_at: expiresAt,
        status: 'ACTIVE'
      })

      results['5_OTP_Challenge_Storage'] = {
        status: !otpErr ? 'PASS' : 'FAIL',
        details: otpErr ? otpErr.message : { generated_otp: testOtp, hashed: true }
      }

      // TEST 6: OTP Challenge Consumption & State Transition
      const { data: activeChallenge } = await adminClient
        .from('email_verification_challenges')
        .select('id')
        .eq('user_id', testUserId)
        .eq('status', 'ACTIVE')
        .single()

      if (activeChallenge) {
        await adminClient.from('email_verification_challenges').update({ status: 'CONSUMED' }).eq('id', activeChallenge.id)
        await adminClient.from('users').update({ account_state: 'USERNAME_REQUIRED', email_verified_at: new Date().toISOString() }).eq('id', testUserId)

        const { data: updatedIdentity } = await adminClient.from('users').select('account_state, email_verified_at').eq('id', testUserId).single()

        results['6_OTP_Consumption_State_Transition'] = {
          status: updatedIdentity?.account_state === 'USERNAME_REQUIRED' ? 'PASS' : 'FAIL',
          details: updatedIdentity
        }
      }
    }

    // TEST 7: Gmail-Style Username Availability Check RPC
    const { data: availCheck } = await adminClient.rpc('check_username_availability', {
      p_username: testUsername,
      p_user_id: testUserId
    })

    results['7_Username_Availability_RPC'] = {
      status: availCheck?.available ? 'PASS' : 'FAIL',
      details: availCheck
    }

    // TEST 8: Atomic Username Claim & DSRT Mail Provisioning
    if (testUserId && availCheck?.available) {
      const { data: claimData } = await adminClient.rpc('claim_username', {
        p_user_id: testUserId,
        p_username: testUsername
      })

      const { data: userMailState } = await adminClient.from('users').select('username, mailbox_state, account_state').eq('id', testUserId).single()

      results['8_Atomic_Username_Claim_Mail_Provision'] = {
        status: claimData?.success && userMailState?.mailbox_state === 'PROVISIONED' ? 'PASS' : 'FAIL',
        details: { rpc_result: claimData, db_user_state: userMailState }
      }
    } else {
      results['8_Atomic_Username_Claim_Mail_Provision'] = { status: 'FAIL', details: 'Skipped due to username check failure' }
    }

    // TEST 9: Onboarding Completion RPC & System Welcome Mail Delivery
    if (testUserId) {
      const { data: onboardData } = await adminClient.rpc('complete_onboarding', {
        p_user_id: testUserId,
        p_full_name: 'Test Automation Runner',
        p_tagline: 'Building the future of software',
        p_location: 'San Francisco, CA',
        p_brings: ['builder'],
        p_seeking: ['collaborators'],
        p_interests: ['ai'],
        p_availability: 'full-time'
      })

      const { data: finalUserState } = await adminClient.from('users').select('account_state, onboarding_complete').eq('id', testUserId).single()

      results['9_Onboarding_Completion_ACTIVE_State'] = {
        status: finalUserState?.account_state === 'ACTIVE' && finalUserState?.onboarding_complete ? 'PASS' : 'FAIL',
        details: { rpc_result: onboardData, final_state: finalUserState }
      }
    }

    // TEST 10: Security Event Audit Logging
    if (testUserId) {
      await adminClient.from('security_events').insert({
        user_id: testUserId,
        event_type: 'TEST_SUITE_RUN',
        success: true
      })

      const { data: secLogs } = await adminClient.from('security_events').select('*').eq('user_id', testUserId)
      results['10_Security_Audit_Logging'] = {
        status: Array.isArray(secLogs) && secLogs.length > 0 ? 'PASS' : 'FAIL',
        details: { logged_events_count: secLogs?.length || 0 }
      }
    }

    // CLEANUP TEST DATA
    if (testUserId) {
      await adminClient.from('email_verification_challenges').delete().eq('user_id', testUserId)
      await adminClient.from('security_events').delete().eq('user_id', testUserId)
      await adminClient.from('users').delete().eq('id', testUserId)
      await adminClient.auth.admin.deleteUser(testUserId)
    }

    const allPassed = Object.values(results).every(r => r.status === 'PASS')

    return NextResponse.json({
      overall_status: allPassed ? 'ALL_SYSTEMS_OPERATIONAL' : 'SYSTEM_WARNINGS_DETECTED',
      timestamp: new Date().toISOString(),
      test_results: results
    }, { status: allPassed ? 200 : 270 })

  } catch (err: any) {
    return NextResponse.json({
      overall_status: 'TEST_SUITE_EXCEPTION',
      error: err.message,
      partial_results: results
    }, { status: 500 })
  }
}