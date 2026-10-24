import { adminClient } from '@/lib/supabase/admin'

export interface RelationshipMetrics {
  isTrusted: boolean
  isBlocked: boolean
  sentCount: number
  repliedCount: number
  trustBonusScore: number // Score reduction for spam calculation (0.0 to 0.6)
}

export interface ContactGraphNode {
  identity_id: string
  dsrt_email: string
  display_name: string
  avatar_url: string | null
  entity_type: string
  is_explicitly_trusted: boolean
  is_explicitly_blocked: boolean
  messages_sent_count: number
  messages_replied_count: number
  last_contact_at: string
}

/**
 * Get relationship metrics for a sender-recipient pair.
 */
export async function getPairwiseRelationship(
  senderIdentityId: string,
  recipientIdentityId: string
): Promise<RelationshipMetrics> {
  if (!senderIdentityId || !recipientIdentityId) {
    return { isTrusted: false, isBlocked: false, sentCount: 0, repliedCount: 0, trustBonusScore: 0 }
  }

  try {
    const { data: rel } = await adminClient
      .from('mail_sender_relationships')
      .select('*')
      .eq('sender_identity_id', senderIdentityId)
      .eq('recipient_identity_id', recipientIdentityId)
      .maybeSingle()

    if (!rel) {
      return { isTrusted: false, isBlocked: false, sentCount: 0, repliedCount: 0, trustBonusScore: 0 }
    }

    if (rel.is_explicitly_blocked) {
      return {
        isTrusted: false,
        isBlocked: true,
        sentCount: rel.messages_sent_count,
        repliedCount: rel.messages_replied_count,
        trustBonusScore: 0,
      }
    }

    let bonus = 0.0
    if (rel.is_explicitly_trusted) bonus += 0.5
    if (rel.messages_replied_count > 0) bonus += 0.3
    else if (rel.messages_sent_count > 2) bonus += 0.15

    return {
      isTrusted: rel.is_explicitly_trusted || rel.messages_replied_count > 0,
      isBlocked: false,
      sentCount: rel.messages_sent_count,
      repliedCount: rel.messages_replied_count,
      trustBonusScore: Math.min(bonus, 0.6),
    }
  } catch (e) {
    console.error('[RelationshipEngine Error]', e)
    return { isTrusted: false, isBlocked: false, sentCount: 0, repliedCount: 0, trustBonusScore: 0 }
  }
}

/**
 * Record or update pairwise message interaction.
 */
export async function recordPairwiseInteraction(
  senderIdentityId: string,
  recipientIdentityId: string,
  isReply = false
): Promise<void> {
  if (!senderIdentityId || !recipientIdentityId) return

  try {
    const { data: existing } = await adminClient
      .from('mail_sender_relationships')
      .select('id, messages_sent_count, messages_replied_count')
      .eq('sender_identity_id', senderIdentityId)
      .eq('recipient_identity_id', recipientIdentityId)
      .maybeSingle()

    if (existing) {
      await adminClient
        .from('mail_sender_relationships')
        .update({
          messages_sent_count: existing.messages_sent_count + (isReply ? 0 : 1),
          messages_replied_count: existing.messages_replied_count + (isReply ? 1 : 0),
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await adminClient.from('mail_sender_relationships').insert({
        sender_identity_id: senderIdentityId,
        recipient_identity_id: recipientIdentityId,
        messages_sent_count: isReply ? 0 : 1,
        messages_replied_count: isReply ? 1 : 0,
        first_contact_at: new Date().toISOString(),
        last_contact_at: new Date().toISOString(),
      })
    }
  } catch (e) {
    console.error('[Record Interaction Error]', e)
  }
}

/**
 * Explicitly set trust flag for a target sender identity.
 */
export async function setExplicitTrust(
  userIdentityId: string,
  targetIdentityId: string,
  trusted: boolean
): Promise<void> {
  try {
    const { data: existing } = await adminClient
      .from('mail_sender_relationships')
      .select('id')
      .eq('sender_identity_id', targetIdentityId)
      .eq('recipient_identity_id', userIdentityId)
      .maybeSingle()

    if (existing) {
      await adminClient
        .from('mail_sender_relationships')
        .update({
          is_explicitly_trusted: trusted,
          is_explicitly_blocked: trusted ? false : undefined,
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await adminClient.from('mail_sender_relationships').insert({
        sender_identity_id: targetIdentityId,
        recipient_identity_id: userIdentityId,
        is_explicitly_trusted: trusted,
        is_explicitly_blocked: false,
        messages_sent_count: 0,
        messages_replied_count: 0,
      })
    }
  } catch (e) {
    console.error('[Set Trust Error]', e)
    throw e
  }
}

/**
 * Explicitly set block flag for a target sender identity.
 */
export async function setExplicitBlock(
  userIdentityId: string,
  targetIdentityId: string,
  blocked: boolean
): Promise<void> {
  try {
    const { data: existing } = await adminClient
      .from('mail_sender_relationships')
      .select('id')
      .eq('sender_identity_id', targetIdentityId)
      .eq('recipient_identity_id', userIdentityId)
      .maybeSingle()

    if (existing) {
      await adminClient
        .from('mail_sender_relationships')
        .update({
          is_explicitly_blocked: blocked,
          is_explicitly_trusted: blocked ? false : undefined,
          last_contact_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
    } else {
      await adminClient.from('mail_sender_relationships').insert({
        sender_identity_id: targetIdentityId,
        recipient_identity_id: userIdentityId,
        is_explicitly_blocked: blocked,
        is_explicitly_trusted: false,
        messages_sent_count: 0,
        messages_replied_count: 0,
      })
    }
  } catch (e) {
    console.error('[Set Block Error]', e)
    throw e
  }
}

/**
 * Fetch relationship graph contacts for a user identity.
 */
export async function getUserContactsGraph(
  userIdentityId: string,
  filter?: 'trusted' | 'blocked' | 'all'
): Promise<ContactGraphNode[]> {
  try {
    let query = adminClient
      .from('mail_sender_relationships')
      .select(`
        sender_identity_id,
        is_explicitly_trusted,
        is_explicitly_blocked,
        messages_sent_count,
        messages_replied_count,
        last_contact_at,
        mail_identities!mail_sender_relationships_sender_identity_id_fkey(
          id, dsrt_email, display_name, avatar_url, entity_type
        )
      `)
      .eq('recipient_identity_id', userIdentityId)
      .order('last_contact_at', { ascending: false })

    if (filter === 'trusted') {
      query = query.eq('is_explicitly_trusted', true)
    } else if (filter === 'blocked') {
      query = query.eq('is_explicitly_blocked', true)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map((row: any) => {
      const ident = row.mail_identities || {}
      return {
        identity_id: row.sender_identity_id,
        dsrt_email: ident.dsrt_email || '',
        display_name: ident.display_name || 'Builder',
        avatar_url: ident.avatar_url || null,
        entity_type: ident.entity_type || 'user',
        is_explicitly_trusted: row.is_explicitly_trusted || false,
        is_explicitly_blocked: row.is_explicitly_blocked || false,
        messages_sent_count: row.messages_sent_count || 0,
        messages_replied_count: row.messages_replied_count || 0,
        last_contact_at: row.last_contact_at,
      }
    })
  } catch (e) {
    console.error('[Get User Contacts Graph Error]', e)
    return []
  }
}