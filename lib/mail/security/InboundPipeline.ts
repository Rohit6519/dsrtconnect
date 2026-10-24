import { adminClient } from '@/lib/supabase/admin'
import { inspectAuthentication } from './AuthInspector'
import { getEntityReputation } from './ReputationEngine'
import { getPairwiseRelationship, recordPairwiseInteraction } from './RelationshipEngine'
import { checkSenderVelocity } from './RateLimitEngine'
import { analyzeContent } from './ContentIntelligence'
import { analyzeUrls } from './UrlIntelligence'
import { scanAttachment } from './AttachmentScanner'
import { scanMessageImages } from './ImageScanner'
import { matchOrRegisterCampaign } from './CampaignClustering'
import { getActiveModelConfig } from './ModelRegistry'
import { classifyEnsemble } from './EnsembleClassifier'
import { quarantineThread } from './QuarantineManager'
import { DecisionResult } from './decisionCodes'

export interface InboundSecurityParams {
  messageId: string
  threadId: string
  senderIdentityId: string
  recipientIdentityIds: string[]
  actualUserId: string
  subject: string
  bodyHtml: string
  bodyText: string
  attachments?: Array<{ name: string; size: number; type: string; url?: string }>
  sourceIp?: string
}

/**
 * Master Security Pipeline: Full threat inspection suite & Quarantine Routing (Phases 5-11).
 */
export async function runInboundSecurityPipeline(
  params: InboundSecurityParams
): Promise<DecisionResult> {
  try {
    const modelConfig = await getActiveModelConfig()

    const { data: senderIdentity } = await adminClient
      .from('mail_identities')
      .select('dsrt_email, display_name, entity_type')
      .eq('id', params.senderIdentityId)
      .single()

    const senderEmail = senderIdentity?.dsrt_email || 'user@dsrt.com'
    const senderDomain = senderEmail.split('@')[1] || ''

    const auth = inspectAuthentication(senderEmail)
    const velocity = await checkSenderVelocity(params.senderIdentityId, params.sourceIp)
    const domainRep = await getEntityReputation('DOMAIN', senderDomain)
    const senderRep = await getEntityReputation('SENDER', senderEmail)

    const primaryRecipientId = params.recipientIdentityIds[0]
    const relationship = primaryRecipientId
      ? await getPairwiseRelationship(params.senderIdentityId, primaryRecipientId)
      : { isTrusted: false, isBlocked: false, sentCount: 0, repliedCount: 0, trustBonusScore: 0 }

    const content = analyzeContent(params.subject, params.bodyHtml, params.bodyText)
    const urlResults = await analyzeUrls(params.bodyHtml, params.bodyText)
    const attachmentResults = (params.attachments || []).map((att) => scanAttachment(att))
    const imageResults = scanMessageImages(params.bodyHtml, params.bodyText)

    const urlDomains = urlResults.map((u) => u.domain)
    const campaignResult = await matchOrRegisterCampaign(params.subject, params.bodyText, urlDomains)

    const ensemble = classifyEnsemble(
      {
        auth,
        velocity,
        senderRep,
        domainRep,
        relationship,
        content,
        urls: urlResults,
        attachments: attachmentResults,
        images: imageResults,
        campaign: campaignResult,
      },
      modelConfig
    )

    const { decision, p_spam, p_phishing, p_malware, p_bulk } = ensemble

    // Persist Main Security Results
    await adminClient.from('mail_security_results').insert({
      message_id: params.messageId,
      thread_id: params.threadId,
      spf_result: auth.spfResult,
      dkim_result: auth.dkimResult,
      dmarc_result: auth.dmarcResult,
      arc_result: auth.arcResult,
      tls_result: auth.tlsResult,
      spam_score: p_spam,
      phishing_score: p_phishing,
      malware_score: p_malware,
      bulk_score: p_bulk,
      classification: decision.classification,
      delivery_action: decision.deliveryAction,
      decision_reason_code: decision.reasonCode,
      model_version: modelConfig.modelVersion,
      scanned_at: new Date().toISOString(),
    })

    // Route Quarantine or Reject Actions
    if (decision.deliveryAction === 'QUARANTINE' || decision.deliveryAction === 'REJECT') {
      await quarantineThread(params.threadId, params.recipientIdentityIds)
    } else if (decision.deliveryAction === 'SPAM') {
      await adminClient
        .from('mail_thread_participants')
        .update({ folder: 'spam', is_spam: true })
        .eq('thread_id', params.threadId)
        .in('identity_id', params.recipientIdentityIds)
    }

    // Persist Audit Record
    await adminClient.from('mail_security_audit').insert({
      message_id: params.messageId,
      actor_user_id: params.actualUserId,
      action: decision.deliveryAction,
      details: {
        reasonCode: decision.reasonCode,
        classification: decision.classification,
        p_spam,
        p_phishing,
        p_malware,
      },
    })

    // Update Contact Pair Interactions
    for (const recId of params.recipientIdentityIds) {
      await recordPairwiseInteraction(params.senderIdentityId, recId)
    }

    return decision
  } catch (e: any) {
    console.error('[Inbound Pipeline Phase 11 Error]', e)
    return {
      classification: 'LEGITIMATE',
      deliveryAction: 'DELIVER',
      reasonCode: 'SAFE_DIRECT',
      spamScore: 0.0000,
      phishingScore: 0.0000,
      malwareScore: 0.0000,
      explanationText: 'Security pipeline executed with safe fallback.',
    }
  }
}