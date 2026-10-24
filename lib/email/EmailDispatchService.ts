import { Resend } from 'resend'
import { adminClient } from '@/lib/supabase/admin'
import { welcomeEmailTemplate } from './templates/welcome'
import { verificationEmailTemplate } from './templates/verification'
import { securityAlertTemplate } from './templates/security-alert'
import { passwordResetTemplate } from './templates/password-reset'

const FROM_EMAIL = process.env.EMAIL_FROM || 'verify@dsrtai.com'
const FROM_NAME = process.env.EMAIL_FROM_NAME || 'DSRT Connect'

export interface QueuedEmail {
  id: string
  user_id: string
  recipient_email: string
  email_type: string
  priority: number
  subject: string
  payload: Record<string, any>
  attempts: number
}

export class EmailDispatchService {
  private static resend: Resend | null = null

  private static getResend(): Resend | null {
    if (this.resend) return this.resend
    const key = process.env.RESEND_API_KEY
    if (!key) {
      console.error('[EmailDispatchService] RESEND_API_KEY missing')
      return null
    }
    this.resend = new Resend(key)
    return this.resend
  }

  static async processBatch(batchSize: number = 10): Promise<{ sent: number; failed: number; skipped: number }> {
    const { data: batch, error } = await adminClient.rpc('dequeue_email_batch', { p_batch_size: batchSize })
    if (error || !batch || batch.length === 0) {
      return { sent: 0, failed: 0, skipped: 0 }
    }

    let sent = 0, failed = 0, skipped = 0

    for (const email of batch as QueuedEmail[]) {
      const { data: quota } = await adminClient.rpc('can_send_email', { p_priority: email.priority })
      
      if (!quota?.can_send) {
        await adminClient
          .from('email_queue')
          .update({ status: 'PENDING', scheduled_for: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
          .eq('id', email.id)
        skipped++
        continue
      }

      const result = await this.dispatchEmail(email)
      if (result.success) {
        await adminClient.rpc('mark_email_sent', { p_email_id: email.id, p_provider_message_id: result.messageId })
        sent++
      } else {
        await adminClient.rpc('mark_email_failed', { p_email_id: email.id, p_error: result.error })
        failed++
      }
    }

    return { sent, failed, skipped }
  }

  private static async dispatchEmail(email: QueuedEmail): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const resend = this.getResend()
    if (!resend) return { success: false, error: 'RESEND_NOT_CONFIGURED' }

    try {
      const template = this.buildTemplate(email)
      if (!template) return { success: false, error: 'UNKNOWN_TEMPLATE' }

      const { data, error } = await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email.recipient_email],
        subject: email.subject,
        html: template
      })

      if (error) return { success: false, error: error.message }
      return { success: true, messageId: data?.id }
    } catch (err: any) {
      return { success: false, error: err.message || 'Unknown dispatch error' }
    }
  }

  private static buildTemplate(email: QueuedEmail): string | null {
    switch (email.email_type) {
      case 'WELCOME':
        return welcomeEmailTemplate(email.payload)
      case 'IDENTITY_CREATED':
        return welcomeEmailTemplate(email.payload)
      case 'EMAIL_VERIFICATION':
        return verificationEmailTemplate(email.payload)
      case 'PASSWORD_RESET':
        return passwordResetTemplate(email.payload)
      case 'SECURITY_ALERT':
      case 'SUSPICIOUS_LOGIN':
        return securityAlertTemplate(email.payload)
      default:
        return null
    }
  }

  static async enqueue(params: {
    userId: string
    recipientEmail: string
    emailType: string
    subject: string
    payload?: Record<string, any>
    scheduledFor?: Date
  }): Promise<string | null> {
    const priority = this.priorityFor(params.emailType)
    const { data, error } = await adminClient
      .from('email_queue')
      .insert({
        user_id: params.userId,
        recipient_email: params.recipientEmail,
        email_type: params.emailType,
        priority,
        subject: params.subject,
        payload: params.payload || {},
        status: 'PENDING',
        scheduled_for: params.scheduledFor?.toISOString() || null
      })
      .select('id')
      .single()

    if (error) {
      console.error('[EmailDispatchService.enqueue] Error:', error)
      return null
    }
    return data.id
  }

  private static priorityFor(type: string): number {
    if (['PASSWORD_RESET', 'SECURITY_ALERT', 'SUSPICIOUS_LOGIN', 'ACCOUNT_RECOVERY'].includes(type)) return 0
    if (['EMAIL_VERIFICATION', 'EMAIL_CHANGE_CONFIRM', 'IMPORTANT_ACCOUNT_NOTIF'].includes(type)) return 1
    if (['WELCOME', 'IDENTITY_CREATED'].includes(type)) return 2
    return 3
  }
}