export type DecisionReasonCode =
  | 'SAFE_DIRECT'
  | 'SAFE_CONTACT_RELATIONSHIP'
  | 'SAFE_INTERNAL_SYSTEM'
  | 'AUTH_DKIM_FAIL'
  | 'AUTH_SPF_FAIL'
  | 'AUTH_DMARC_REJECT'
  | 'REPUTATION_IP_LOW'
  | 'REPUTATION_DOMAIN_LOW'
  | 'URL_LOOKALIKE_DOMAIN'
  | 'URL_KNOWN_PHISHING'
  | 'ATTACHMENT_MIME_MISMATCH'
  | 'ATTACHMENT_EXECUTABLE_BLOCKED'
  | 'CONTENT_PHISHING_HEURISTIC'
  | 'CAMPAIGN_SPAM_CLUSTER'
  | 'BEHAVIOR_ANOMALOUS_VELOCITY'
  | 'USER_EXPLICIT_BLOCK'

export interface DecisionResult {
  classification: 'LEGITIMATE' | 'SPAM' | 'PHISHING' | 'MALWARE'
  deliveryAction: 'DELIVER' | 'DELIVER_WITH_WARNING' | 'SPAM' | 'QUARANTINE' | 'REJECT'
  reasonCode: DecisionReasonCode
  spamScore: number
  phishingScore: number
  malwareScore: number
  explanationText: string
}