import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { processUserFeedback, FeedbackType } from '@/lib/mail/security/FeedbackEngine'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: threadId } = await context.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const feedbackType = body.feedback_type as FeedbackType
    const messageId = body.message_id as string | undefined

    const validTypes: FeedbackType[] = [
      'REPORT_SPAM',
      'REPORT_PHISHING',
      'NOT_SPAM',
      'TRUST_SENDER',
      'BLOCK_SENDER',
    ]

    if (!feedbackType || !validTypes.includes(feedbackType)) {
      return NextResponse.json(
        { error: 'Invalid feedback_type. Expected one of: REPORT_SPAM, REPORT_PHISHING, NOT_SPAM, TRUST_SENDER, BLOCK_SENDER' },
        { status: 400 }
      )
    }

    await processUserFeedback({
      userId: user.id,
      threadId,
      messageId,
      feedbackType,
    })

    return NextResponse.json({
      success: true,
      thread_id: threadId,
      feedback_type: feedbackType,
    })
  } catch (e: any) {
    console.error('Report Endpoint Error:', e)
    return NextResponse.json(
      { error: e?.message || 'Failed to process security feedback' },
      { status: 500 }
    )
  }
}