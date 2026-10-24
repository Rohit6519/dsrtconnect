import { adminClient } from '@/lib/supabase/admin'

export interface OutboundProtectionParams {
  userId: string
  fromIdentityId: string
  recipientCount: number
  subject: string
  bodyText: string
}

export interface OutboundProtectionResult {
  allowed: boolean
  reason?: string
  dailyQuota: number
  sentToday: number
  isAccountFrozen?: boolean
}

const DAILY_QUOTAS: Record<string, number> = {
  user: 200,
  project: 500,
  venture: 1000,
}

const BURST_LIMIT_1M = 25

export async function inspectOutboundMessage(
  params: OutboundProtectionParams
): Promise<OutboundProtectionResult> {
  const { userId, fromIdentityId, recipientCount, subject, bodyText } = params

  try {
    const { data: identity } = await adminClient
      .from('mail_identities')
      .select('id, entity_type, dsrt_email')
      .eq('id', fromIdentityId)
      .single()

    if (!identity) {
      return { allowed: false, reason: 'Sender identity not found', dailyQuota: 0, sentToday: 0 }
    }

    const { data: dsrtIdent } = await adminClient
      .from('dsrt_mail_identities')
      .select('is_active')
      .eq('user_id', userId)
      .maybeSingle()

    if (dsrtIdent && dsrtIdent.is_active === false) {
      return {
        allowed: false,
        reason: 'Your DSRT Mail identity has been temporarily frozen due to security policy violations.',
        dailyQuota: 0,
        sentToday: 0,
        isAccountFrozen: true,
      }
    }

    const quota = DAILY_QUOTAS[identity.entity_type] || 200
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    const startOfDayIso = startOfDay.toISOString()

    const { count: sentTodayCount } = await adminClient
      .from('mail_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_identity_id', fromIdentityId)
      .gte('sent_at', startOfDayIso)

    const sentToday = sentTodayCount || 0

    if (sentToday + recipientCount > quota) {
      return {
        allowed: false,
        reason: `Daily outbound limit of ${quota} emails reached for this identity. Sent today: ${sentToday}.`,
        dailyQuota: quota,
        sentToday,
      }
    }

    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: burstCount } = await adminClient
      .from('mail_messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_identity_id', fromIdentityId)
      .gte('sent_at', oneMinAgo)

    if ((burstCount || 0) >= BURST_LIMIT_1M) {
      await adminClient
        .from('dsrt_mail_identities')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      await adminClient.from('mail_security_audit').insert({
        actor_user_id: userId,
        action: 'OUTBOUND_ACCOUNT_TAKEOVER_FREEZE',
        details: {
          from_identity_id: fromIdentityId,
          burst_count_1m: burstCount,
          reason: 'Excessive burst velocity',
        },
      })

      return {
        allowed: false,
        reason: 'Unusual sending velocity detected. Your identity has been temporarily locked to protect your account.',
        dailyQuota: quota,
        sentToday,
        isAccountFrozen: true,
      }
    }

    const fullText = `${subject} ${bodyText}`
    if (/\b(bank account suspended|wire transfer urgent|send crypto|bitcoin wallet required)\b/i.test(fullText)) {
      return {
        allowed: false,
        reason: 'Message blocked by DSRT Outbound Security filter.',
        dailyQuota: quota,
        sentToday,
      }
    }

    return {
      allowed: true,
      dailyQuota: quota,
      sentToday,
    }
  } catch (e: any) {
    console.error('[Outbound Protection Error]', e)
    return {
      allowed: true,
      dailyQuota: 200,
      sentToday: 0,
    }
  }
}