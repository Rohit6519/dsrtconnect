import { AuthInspectionResult } from './AuthInspector'
import { ReputationSummary } from './ReputationEngine'
import { RelationshipMetrics } from './RelationshipEngine'
import { RateLimitCheckResult } from './RateLimitEngine'
import { ContentAnalysisResult } from './ContentIntelligence'
import { ExtractedUrlInfo } from './UrlIntelligence'
import { AttachmentScanResult } from './AttachmentScanner'
import { ImageScanResult } from './ImageScanner'
import { CampaignMatchResult } from './CampaignClustering'
import { ModelConfig } from './ModelRegistry'
import { DecisionResult, DecisionReasonCode } from './decisionCodes'

export interface EnsembleFeatureInputs {
  auth: AuthInspectionResult
  velocity: RateLimitCheckResult
  senderRep: ReputationSummary
  domainRep: ReputationSummary
  relationship: RelationshipMetrics
  content: ContentAnalysisResult
  urls: ExtractedUrlInfo[]
  attachments: AttachmentScanResult[]
  images: ImageScanResult
  campaign: CampaignMatchResult
}

export interface EnsembleOutput {
  p_spam: number
  p_phishing: number
  p_malware: number
  p_bulk: number
  decision: DecisionResult
}

/**
 * Executes multi-model ensemble classification over all security signals.
 */
export function classifyEnsemble(
  features: EnsembleFeatureInputs,
  config: ModelConfig
): EnsembleOutput {
  const { auth, velocity, senderRep, domainRep, relationship, content, urls, attachments, images, campaign } = features

  // 1. Malware Model (Attachment & Executable Analysis)
  let p_malware = 0.0000
  const hasMaliciousAtt = attachments.some((a) => a.sandboxDisposition === 'MALICIOUS' || a.hasDangerousExtension)
  const hasSuspiciousAtt = attachments.some((a) => a.sandboxDisposition === 'SUSPICIOUS' || a.mimeMismatch)

  if (hasMaliciousAtt) p_malware = 1.0000
  else if (hasSuspiciousAtt) p_malware = 0.6500

  // 2. Phishing Model (Lookalike Domains, Credential Requests, Display Name Mismatch)
  let p_phishing = 0.0000
  const hasLookalikeUrl = urls.some((u) => u.isLookalike)
  const maxUrlRisk = urls.reduce((max, u) => Math.max(max, u.riskScore), 0.0)

  if (hasLookalikeUrl) p_phishing += 0.8500
  p_phishing += maxUrlRisk * 0.30
  p_phishing += content.credentialRequestScore * 0.35
  p_phishing += content.urgencyScore * 0.20

  if (auth.spfResult === 'FAIL' && auth.dkimResult === 'FAIL') {
    p_phishing += 0.30
  }

  // 3. Spam Model (Campaign Clusters, Content Risk, Velocity, Time-Decay Reputation)
  let p_spam = 0.0000
  if (relationship.isBlocked) {
    p_spam = 1.0000
  } else if (campaign.isKnownSpamCampaign) {
    p_spam = 0.9500
  } else {
    p_spam += content.overallContentRiskScore * config.weights.w_content
    p_spam += velocity.riskPenaltyScore * config.weights.w_velocity
    p_spam += images.imageToTextRatioScore * 0.15

    if (campaign.campaignMessageCount > 20) p_spam += 0.2500

    // Low reputation penalty
    if (senderRep.riskLevel === 'CRITICAL' || domainRep.riskLevel === 'CRITICAL') {
      p_spam += 0.3000
    }

    // Auth failures
    if (auth.spfResult === 'FAIL') p_spam += 0.20
    if (auth.dkimResult === 'FAIL') p_spam += 0.20
  }

  // 4. Bulk Model (Mass distribution & high CTA density)
  let p_bulk = 0.0000
  if (content.ctaDensity > 2.0) p_bulk += 0.60
  if (campaign.campaignMessageCount > 5) p_bulk += 0.30

  // 5. Apply Relationship Trust Bonus (Reduces p_spam and p_phishing)
  p_spam = Math.max(0.0000, p_spam - relationship.trustBonusScore)
  p_phishing = Math.max(0.0000, p_phishing - relationship.trustBonusScore)

  // Clamp probabilities to [0.0000, 1.0000]
  p_spam = Number(Math.min(1.0, Math.max(0.0, p_spam)).toFixed(4))
  p_phishing = Number(Math.min(1.0, Math.max(0.0, p_phishing)).toFixed(4))
  p_malware = Number(Math.min(1.0, Math.max(0.0, p_malware)).toFixed(4))
  p_bulk = Number(Math.min(1.0, Math.max(0.0, p_bulk)).toFixed(4))

  // 6. Map Ensemble Output to Final Delivery Action & Reason Code
  let classification: DecisionResult['classification'] = 'LEGITIMATE'
  let deliveryAction: DecisionResult['deliveryAction'] = 'DELIVER'
  let reasonCode: DecisionReasonCode = 'SAFE_DIRECT'

  if (p_malware >= config.malwareThreshold) {
    classification = 'MALWARE'
    deliveryAction = 'QUARANTINE'
    reasonCode = 'ATTACHMENT_EXECUTABLE_BLOCKED'
  } else if (relationship.isBlocked) {
    classification = 'SPAM'
    deliveryAction = 'SPAM'
    reasonCode = 'USER_EXPLICIT_BLOCK'
  } else if (p_phishing >= config.phishingThreshold) {
    classification = 'PHISHING'
    deliveryAction = 'QUARANTINE'
    reasonCode = hasLookalikeUrl ? 'URL_LOOKALIKE_DOMAIN' : 'CONTENT_PHISHING_HEURISTIC'
  } else if (p_spam >= config.spamThreshold) {
    classification = 'SPAM'
    deliveryAction = 'SPAM'
    reasonCode = campaign.isKnownSpamCampaign ? 'CAMPAIGN_SPAM_CLUSTER' : 'CAMPAIGN_SPAM_CLUSTER'
  } else if (relationship.isTrusted) {
    reasonCode = 'SAFE_CONTACT_RELATIONSHIP'
  } else if (auth.isInternalDsrtDomain) {
    reasonCode = 'SAFE_INTERNAL_SYSTEM'
  }

  const decision: DecisionResult = {
    classification,
    deliveryAction,
    reasonCode,
    spamScore: p_spam,
    phishingScore: p_phishing,
    malwareScore: p_malware,
    explanationText: `Ensemble classified message as ${classification} (${reasonCode}).`,
  }

  return {
    p_spam,
    p_phishing,
    p_malware,
    p_bulk,
    decision,
  }
}