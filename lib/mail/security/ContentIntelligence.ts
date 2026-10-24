export interface ContentAnalysisResult {
  htmlToTextRatio: number
  textEntropy: number
  ctaDensity: number
  urgencyScore: number
  financialScore: number
  credentialRequestScore: number
  headerAnomalies: string[]
  overallContentRiskScore: number
}

const URGENCY_REGEX = /\b(urgent|action required|account suspended|verify immediately|unauthorized access|security alert|login attempt|immediate attention|24 hours|restricted)\b/gi
const FINANCIAL_REGEX = /\b(invoice|payment|transfer|bank|wire|crypto|bitcoin|wallet|receipt|billing|usd|usd\b|\$|refund|credit card)\b/gi
const CREDENTIAL_REGEX = /\b(password|passcode|pin|login|sign in|verify account|confirm identity|sso|reset link|auth code|2fa|mfa)\b/gi
const CTA_REGEX = /\b(click here|login now|verify now|claim|update info|download|open attachment|confirm email|action link)\b/gi

/**
 * Calculates Shannon entropy for a string (measures character randomness).
 */
function calculateEntropy(text: string): number {
  if (!text || text.length === 0) return 0
  const len = text.length
  const freq: Record<string, number> = {}

  for (let i = 0; i < len; i++) {
    const char = text[i]
    freq[char] = (freq[char] || 0) + 1
  }

  let entropy = 0
  for (const char in freq) {
    const p = freq[char] / len
    entropy -= p * Math.log2(p)
  }

  return Number(entropy.toFixed(2))
}

/**
 * Extracts deep content security features from subject and body.
 */
export function analyzeContent(
  subject: string,
  bodyHtml: string,
  bodyText: string
): ContentAnalysisResult {
  const fullText = `${subject || ''} ${bodyText || ''}`.trim()
  const rawHtml = bodyHtml || ''

  // 1. HTML to Text Ratio
  const htmlLen = rawHtml.length
  const textLen = fullText.length
  const htmlToTextRatio = htmlLen > 0 ? Number((htmlLen / Math.max(1, textLen)).toFixed(2)) : 0

  // 2. Shannon Text Entropy
  const textEntropy = calculateEntropy(fullText)

  // 3. Keyword Pattern Matching
  const urgencyMatches = fullText.match(URGENCY_REGEX) || []
  const financialMatches = fullText.match(FINANCIAL_REGEX) || []
  const credentialMatches = fullText.match(CREDENTIAL_REGEX) || []
  const ctaMatches = fullText.match(CTA_REGEX) || []

  const urgencyScore = Math.min(1.0, urgencyMatches.length * 0.25)
  const financialScore = Math.min(1.0, financialMatches.length * 0.2)
  const credentialRequestScore = Math.min(1.0, credentialMatches.length * 0.3)
  const ctaDensity = Number((ctaMatches.length / Math.max(1, textLen / 100)).toFixed(2))

  // 4. Header & Subject Anomalies
  const headerAnomalies: string[] = []
  if (subject && subject === subject.toUpperCase() && subject.length > 8) {
    headerAnomalies.push('ALL_CAPS_SUBJECT')
  }
  if (/\b(re:|fwd:)\b/i.test(subject) && textLen < 50) {
    headerAnomalies.push('FAKE_REPLY_HEADER')
  }
  if (/<script/i.test(rawHtml)) {
    headerAnomalies.push('EMBEDDED_SCRIPT_IN_HTML')
  }

  // 5. Composite Content Risk Score
  let riskScore = 0.0
  riskScore += urgencyScore * 0.25
  riskScore += credentialRequestScore * 0.35
  if (headerAnomalies.includes('EMBEDDED_SCRIPT_IN_HTML')) riskScore += 0.40
  if (headerAnomalies.includes('FAKE_REPLY_HEADER')) riskScore += 0.20
  if (htmlToTextRatio > 10.0 && textLen < 100) riskScore += 0.15 // High HTML padding with minimal text

  return {
    htmlToTextRatio,
    textEntropy,
    ctaDensity,
    urgencyScore: Number(urgencyScore.toFixed(2)),
    financialScore: Number(financialScore.toFixed(2)),
    credentialRequestScore: Number(credentialRequestScore.toFixed(2)),
    headerAnomalies,
    overallContentRiskScore: Math.min(1.0, Number(riskScore.toFixed(4))),
  }
}