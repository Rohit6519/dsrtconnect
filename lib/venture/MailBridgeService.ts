import { SupabaseClient } from '@supabase/supabase-js'

interface InvitationContext {
  invitation: any
  venture: any
  invitedUser: any
  invitedBy: any
  position?: any
}

export class MailBridgeService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Ensures a mail identity exists for a user entity.
   */
  private async ensureUserIdentity(userId: string): Promise<string | null> {
    const { data: existing } = await this.supabase
      .from('mail_identities')
      .select('id')
      .eq('entity_type', 'user')
      .eq('entity_id', userId)
      .maybeSingle()

    if (existing) return existing.id

    const { data: user } = await this.supabase
      .from('users')
      .select('id, username, full_name, avatar_url, dsrt_email')
      .eq('id', userId)
      .single()

    if (!user) return null

    const email = user.dsrt_email || `${user.username?.toLowerCase() || userId.slice(0, 8)}@dsrt.com`

    const { data: created, error } = await this.supabase
      .from('mail_identities')
      .insert({
        entity_type: 'user',
        entity_id: userId,
        dsrt_email: email,
        display_name: user.full_name || user.username || 'DSRT User',
        avatar_url: user.avatar_url,
      })
      .select('id')
      .single()

    if (error) {
      // Race condition — try to fetch again
      const { data: retry } = await this.supabase
        .from('mail_identities')
        .select('id')
        .eq('entity_type', 'user')
        .eq('entity_id', userId)
        .maybeSingle()
      return retry?.id || null
    }

    return created?.id || null
  }

  /**
   * Creates a structured invitation mail thread + message.
   * Returns { threadId, messageId } on success.
   */
  async createInvitationThread(ctx: InvitationContext): Promise<{
    threadId: string | null
    messageId: string | null
  }> {
    const senderIdentityId = await this.ensureUserIdentity(ctx.invitedBy.id)
    const recipientIdentityId = await this.ensureUserIdentity(ctx.invitedUser.id)

    if (!senderIdentityId || !recipientIdentityId) {
      return { threadId: null, messageId: null }
    }

    // Create thread
    const { data: thread, error: threadErr } = await this.supabase
      .from('mail_threads')
      .insert({
        subject: `Join ${ctx.venture.name} as ${ctx.invitation.proposed_role_title || 'Team Member'}`,
        source_type: 'venture_invitation',
        source_entity_type: 'venture',
        source_entity_id: ctx.venture.id,
      })
      .select('id')
      .single()

    if (threadErr || !thread) {
      console.error('Failed to create mail thread:', threadErr)
      return { threadId: null, messageId: null }
    }

    // Add participants
    await this.supabase.from('mail_thread_participants').insert([
      {
        thread_id: thread.id,
        identity_id: senderIdentityId,
        role: 'from',
        folder: 'sent',
        is_read: true,
        last_read_at: new Date().toISOString(),
      },
      {
        thread_id: thread.id,
        identity_id: recipientIdentityId,
        role: 'to',
        folder: 'inbox',
        is_read: false,
      },
    ])

    // Insert structured invitation message
    const bodyText = this.buildInvitationBodyText(ctx)
    const { data: message, error: msgErr } = await this.supabase
      .from('mail_messages')
      .insert({
        thread_id: thread.id,
        sender_identity_id: senderIdentityId,
        actual_user_id: ctx.invitedBy.id,
        body_html: `<p>${ctx.invitation.personal_message || 'You have been invited to join our venture team.'}</p>`,
        body_text: bodyText,
        message_type: 'team_invitation',
        reference_type: 'venture_invitation',
        reference_id: ctx.invitation.id,
        metadata: {
          invitation_id: ctx.invitation.id,
          secure_token: ctx.invitation.secure_token,
          venture_id: ctx.venture.id,
          venture_slug: ctx.venture.slug,
          venture_name: ctx.venture.name,
          venture_logo: ctx.venture.logo_url,
          role_title: ctx.invitation.proposed_role_title,
          team_name: ctx.position?.team_name,
          expires_at: ctx.invitation.expires_at,
        },
      })
      .select('id')
      .single()

    if (msgErr) {
      console.error('Failed to create mail message:', msgErr)
      return { threadId: thread.id, messageId: null }
    }

    // Link back to invitation
    if (message) {
      await this.supabase
        .from('venture_team_invitations')
        .update({
          mail_thread_id: thread.id,
          mail_message_id: message.id,
        })
        .eq('id', ctx.invitation.id)
    }

    return { threadId: thread.id, messageId: message?.id || null }
  }

  /**
   * Appends a system event message to an existing invitation thread.
   * Called when state changes (viewed, held, accepted, rejected, revoked).
   */
  async appendSystemEvent(
    invitationId: string,
    eventType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    // Fetch invitation + thread
    const { data: invitation } = await this.supabase
      .from('venture_team_invitations')
      .select('*, venture:ventures(name, slug, logo_url)')
      .eq('id', invitationId)
      .single()

    if (!invitation?.mail_thread_id) return

    // Use the sender identity for system messages
    const senderIdentityId = await this.ensureUserIdentity(invitation.invited_by_user_id)
    if (!senderIdentityId) return

    const eventLabels: Record<string, string> = {
      'invitation.viewed': 'Invitation viewed',
      'invitation.held': 'Invitation placed on hold',
      'invitation.accepted': 'Invitation accepted · Member joined',
      'invitation.rejected': 'Invitation declined',
      'invitation.revoked': 'Invitation revoked by sender',
      'invitation.expired': 'Invitation expired',
      'invitation.resent': 'Invitation resent',
    }

    const label = eventLabels[eventType] || eventType

    await this.supabase.from('mail_messages').insert({
      thread_id: invitation.mail_thread_id,
      sender_identity_id: senderIdentityId,
      actual_user_id: invitation.invited_by_user_id,
      body_html: `<div style="padding:8px 0;color:#a1a1aa;font-size:13px;">${label}</div>`,
      body_text: label,
      message_type: 'system',
      reference_type: 'venture_invitation',
      reference_id: invitationId,
      metadata: {
        event_type: eventType,
        invitation_id: invitationId,
        venture_slug: invitation.venture?.slug,
        ...metadata,
      },
    })
  }

  private buildInvitationBodyText(ctx: InvitationContext): string {
    const lines = [
      `You've been invited to join ${ctx.venture.name} as ${ctx.invitation.proposed_role_title || 'Team Member'}.`,
    ]
    if (ctx.position?.team_name) {
      lines.push(`Team: ${ctx.position.team_name}`)
    }
    if (ctx.invitation.personal_message) {
      lines.push('')
      lines.push(`Message from sender: "${ctx.invitation.personal_message}"`)
    }
    lines.push('')
    lines.push('Open your DSRT Mail to review and respond.')
    return lines.join('\n')
  }
}