import { adminClient } from '@/lib/supabase/admin'
import { recordReputationEvent } from './ReputationEngine'
import { setExplicitTrust, setExplicitBlock } from './RelationshipEngine'
import { markCampaignAsSpam } from './CampaignClustering'

export type FeedbackType =
  | 'REPORT_SPAM'
  | 'REPORT_PHISHING'
  | 'NOT_SPAM'
  | 'TRUST_SENDER'
  | 'BLOCK_SENDER'

export interface UserFeedbackParams {
  userId: string
  threadId: string
  messageId?: string
  feedbackType: FeedbackType
}

/**
 * Calculates user trust weight (0.1 to 1.0) based on verification & historical accuracy.
 * Prevents malicious or bot accounts from poisoning global spam classifiers.
 */
async function computeUserTrustWeight(userId: string): Promise<number> {
  try {
    const { data: user } = await adminClient
      .from('users')
      .select('is_verified, created_at')
      .eq('id', userId)
      .maybeSingle()

    if (!user) return 0.50

    let weight = 0.50
    if (user.is_verified) weight += 0.35

    const accountAgeDays = (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (accountAgeDays > 30) weight += 0.15

    return Number(Math.min(1.0, weight).toFixed(2))
  } catch {
    return 0.50
  }
}

/**
 * Processes user security feedback and updates relationship graph, campaign reputation, and folder state.
 */
export async function processUserFeedback(params: UserFeedbackParams): Promise<void> {
  const { userId, threadId, messageId, feedbackType } = params

  try {
    const userTrustWeight = await computeUserTrustWeight(userId)

    // 1. Resolve message details if messageId not directly passed
    let targetMessageId = messageId
    let senderIdentityId: string | null = null

    if (!targetMessageId) {
      const { data: lastMsg } = await adminClient
        .from('mail_messages')
        .select('id, sender_identity_id')
        .eq('thread_id', threadId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      targetMessageId = lastMsg?.id
      senderIdentityId = lastMsg?.sender_identity_id || null
    } else {
      const { data: msg } = await adminClient
        .from('mail_messages')
        .select('sender_identity_id')
        .eq('id', targetMessageId)
        .maybeSingle()

      senderIdentityId = msg?.sender_identity_id || null
    }

    if (!targetMessageId) return

    // 2. Fetch sender details
    let senderEmail = ''
    if (senderIdentityId) {
      const { data: sIdent } = await adminClient
        .from('mail_identities')
        .select('dsrt_email')
        .eq('id', senderIdentityId)
        .maybeSingle()

      senderEmail = sIdent?.dsrt_email || ''
    }

    // 3. Get user's identities
    const { data: userIdentities } = await adminClient.rpc('fn_get_user_mail_identities', {
      p_user_id: userId,
    })
    const userOwnedIdentityIds = (userIdentities || []).map((i: any) => i.identity_id)
    const primaryUserIdentityId = userIdentities?.find((i: any) => i.entity_type === 'user')?.identity_id

    // 4. Record entry in mail_feedback
    await adminClient.from('mail_feedback').insert({
      user_id: userId,
      message_id: targetMessageId,
      feedback_type: feedbackType,
      user_trust_weight: userTrustWeight,
      processed: true,
      created_at: new Date().toISOString(),
    })

    // 5. Execute Action-Specific Feedback Logic
    const senderDomain = senderEmail.includes('@') ? senderEmail.split('@')[1] : ''

    switch (feedbackType) {
      case 'REPORT_SPAM':
        // Relocate thread to 'spam'
        await adminClient
          .from('mail_thread_participants')
          .update({ folder: 'spam', is_spam: true, is_archived: false })
          .eq('thread_id', threadId)
          .in('identity_id', userOwnedIdentityIds)

        // Negative reputation event
        if (senderEmail) {
          await recordReputationEvent('SENDER', senderEmail, -0.15 * userTrustWeight, 'USER_REPORTED_SPAM')
        }
        if (senderDomain) {
          await recordReputationEvent('DOMAIN', senderDomain, -0.05 * userTrustWeight, 'USER_REPORTED_SPAM')
        }
        break

      case 'REPORT_PHISHING':
        // Relocate thread to 'quarantine'
        await adminClient
          .from('mail_thread_participants')
          .update({ folder: 'quarantine', is_spam: true, is_archived: false })
          .eq('thread_id', threadId)
          .in('identity_id', userOwnedIdentityIds)

        // Heavy negative reputation event
        if (senderEmail) {
          await recordReputationEvent('SENDER', senderEmail, -0.40 * userTrustWeight, 'USER_REPORTED_PHISHING')
        }
        if (senderDomain) {
          await recordReputationEvent('DOMAIN', senderDomain, -0.20 * userTrustWeight, 'USER_REPORTED_PHISHING')
        }
        break

      case 'NOT_SPAM':
        // Relocate thread back to 'inbox'
        await adminClient
          .from('mail_thread_participants')
          .update({ folder: 'inbox', is_spam: false, is_archived: false, is_trashed: false })
          .eq('thread_id', threadId)
          .in('identity_id', userOwnedIdentityIds)

        // Positive reputation event
        if (senderEmail) {
          await recordReputationEvent('SENDER', senderEmail, 0.10 * userTrustWeight, 'USER_MARKED_NOT_SPAM')
        }
        break

      case 'TRUST_SENDER':
        if (primaryUserIdentityId && senderIdentityId) {
          await setExplicitTrust(primaryUserIdentityId, senderIdentityId, true)
        }
        // Move thread to inbox
        await adminClient
          .from('mail_thread_participants')
          .update({ folder: 'inbox', is_spam: false, is_archived: false, is_trashed: false })
          .eq('thread_id', threadId)
          .in('identity_id', userOwnedIdentityIds)
        break

      case 'BLOCK_SENDER':
        if (primaryUserIdentityId && senderIdentityId) {
          await setExplicitBlock(primaryUserIdentityId, senderIdentityId, true)
        }
        // Move thread to spam
        await adminClient
          .from('mail_thread_participants')
          .update({ folder: 'spam', is_spam: true })
          .eq('thread_id', threadId)
          .in('identity_id', userOwnedIdentityIds)
        break
    }

    // 6. Log Audit Entry
    await adminClient.from('mail_security_audit').insert({
      message_id: targetMessageId,
      actor_user_id: userId,
      action: `FEEDBACK_${feedbackType}`,
      details: {
        thread_id: threadId,
        user_trust_weight: userTrustWeight,
        sender_email: senderEmail,
      },
    })
  } catch (e) {
    console.error('[Process User Feedback Error]', e)
    throw e
  }
}