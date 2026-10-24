import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'
import { EmailDispatchService } from '@/lib/email/EmailDispatchService'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check P1 quota availability
  const { data: quota } = await adminClient.rpc('can_send_email', { p_priority: 1 })
  if (!quota?.can_send) {
    return NextResponse.json({ skipped: true, reason: 'P1_QUOTA_EXHAUSTED' })
  }

  const maxCandidates = Math.min(quota.remaining_priority || 5, 10)

  const { data: candidates, error } = await adminClient.rpc('get_verification_candidates', { p_limit: maxCandidates })
  if (error || !candidates || candidates.length === 0) {
    return NextResponse.json({ queued: 0, reason: 'no_candidates' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dsrtai.com'
  let queued = 0

  for (const candidate of candidates) {
    const enqueued = await EmailDispatchService.enqueue({
      userId: candidate.user_id,
      recipientEmail: candidate.email,
      emailType: 'EMAIL_VERIFICATION',
      subject: '✨ You\'re making great progress on DSRT',
      payload: {
        full_name: candidate.full_name,
        verification_url: `${appUrl}/settings/security?action=verify_email`,
        reason: 'adaptive_prompt'
      }
    })

    if (enqueued) {
      await adminClient
        .from('users')
        .update({ 
          last_verification_email_sent_at: new Date().toISOString(),
          email_verification_status: 'QUEUED'
        })
        .eq('id', candidate.user_id)
      queued++
    }
  }

  return NextResponse.json({
    queued,
    total_candidates: candidates.length,
    quota_remaining: quota.remaining_priority
  })
}