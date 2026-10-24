import { adminClient } from '@/lib/supabase/admin'

export interface CampaignMatchResult {
  campaignId: string | null
  campaignHash: string
  isKnownSpamCampaign: boolean
  matchedByVector: boolean
  similarityScore: number
  campaignMessageCount: number
}

export function extractSubjectPattern(subject: string): string {
  if (!subject) return 'EMPTY_SUBJECT'
  return subject
    .toLowerCase()
    .trim()
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '{UUID}')
    .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, '{DATE}')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '{TIME}')
    .replace(/\b\d+\b/g, '{NUM}')
    .replace(/\s+/g, ' ')
    .trim()
}

function computeCampaignHash(subjectPattern: string, domainTokens: string[]): string {
  const sortedDomains = Array.from(new Set(domainTokens)).sort().join(',')
  const raw = `${subjectPattern}|${sortedDomains}`

  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return `cmp_${Math.abs(hash).toString(16).padStart(16, '0')}`
}

function generateFeatureVector(text: string): number[] {
  const vector = new Array(1536).fill(0.0)
  const normalized = (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const words = normalized.split(/\s+/).filter((w) => w.length > 2)

  if (words.length === 0) return vector

  for (const word of words) {
    let hash = 0
    for (let i = 0; i < word.length; i++) {
      hash = (hash << 5) - hash + word.charCodeAt(i)
      hash |= 0
    }
    const idx = Math.abs(hash) % 1536
    vector[idx] += 1.0 / words.length
  }

  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0.0))
  if (norm > 0) {
    for (let i = 0; i < 1536; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6))
    }
  }

  return vector
}

export async function matchOrRegisterCampaign(
  subject: string,
  bodyText: string,
  urlDomains: string[]
): Promise<CampaignMatchResult> {
  const subjectPattern = extractSubjectPattern(subject)
  const campaignHash = computeCampaignHash(subjectPattern, urlDomains)
  const vector = generateFeatureVector(`${subject} ${bodyText}`)

  try {
    const { data: exactMatch } = await adminClient
      .from('mail_campaigns')
      .select('id, message_count, is_known_spam_campaign')
      .eq('campaign_hash', campaignHash)
      .maybeSingle()

    if (exactMatch) {
      await adminClient
        .from('mail_campaigns')
        .update({
          message_count: exactMatch.message_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', exactMatch.id)

      return {
        campaignId: exactMatch.id,
        campaignHash,
        isKnownSpamCampaign: Boolean(exactMatch.is_known_spam_campaign),
        matchedByVector: false,
        similarityScore: 1.0000,
        campaignMessageCount: exactMatch.message_count + 1,
      }
    }

    const vectorLiteral = `[${vector.join(',')}]`
    
    let vectorMatches: any[] | null = null
    try {
      const { data } = await adminClient.rpc('match_mail_campaigns', {
        query_embedding: vectorLiteral,
        match_threshold: 0.85,
        match_count: 1,
      })
      vectorMatches = data
    } catch {
      vectorMatches = null
    }

    if (vectorMatches && vectorMatches.length > 0) {
      const topMatch = vectorMatches[0]
      return {
        campaignId: topMatch.id,
        campaignHash: topMatch.campaign_hash,
        isKnownSpamCampaign: Boolean(topMatch.is_known_spam_campaign),
        matchedByVector: true,
        similarityScore: Number(topMatch.similarity.toFixed(4)),
        campaignMessageCount: topMatch.message_count,
      }
    }

    const { data: newCampaign } = await adminClient
      .from('mail_campaigns')
      .insert({
        campaign_hash: campaignHash,
        subject_pattern: subjectPattern,
        message_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_known_spam_campaign: false,
      })
      .select('id')
      .single()

    return {
      campaignId: newCampaign?.id || null,
      campaignHash,
      isKnownSpamCampaign: false,
      matchedByVector: false,
      similarityScore: 0.0000,
      campaignMessageCount: 1,
    }
  } catch (e) {
    console.error('[CampaignClustering Error]', e)
    return {
      campaignId: null,
      campaignHash,
      isKnownSpamCampaign: false,
      matchedByVector: false,
      similarityScore: 0.0000,
      campaignMessageCount: 1,
    }
  }
}

export async function markCampaignAsSpam(campaignId: string): Promise<void> {
  if (!campaignId) return
  try {
    await adminClient
      .from('mail_campaigns')
      .update({ is_known_spam_campaign: true })
      .eq('id', campaignId)
  } catch (e) {
    console.error('[Mark Campaign Spam Error]', e)
  }
}