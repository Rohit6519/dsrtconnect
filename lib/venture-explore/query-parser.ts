/**
 * Parses natural language queries into structured filter intent.
 * 
 * Examples:
 *   "robotics in India"          → { keywords: ['robotics'], location: 'India' }
 *   "MVP biotech companies"      → { keywords: ['biotech'], stage: 'mvp' }
 *   "founders building robotics" → { keywords: ['robotics'], intent: 'founder' }
 */

export interface ParsedQuery {
  keywords: string[]
  domains: string[]
  location?: string
  stage?: string
  funding?: string
  venture_type?: string
  intent?: 'venture' | 'founder' | 'opportunity'
  is_hiring?: boolean
  original: string
}

// Stage vocabulary
const STAGE_KEYWORDS: Record<string, string> = {
  'idea': 'idea', 'ideation': 'idea',
  'prototype': 'prototype', 'prototyping': 'prototype',
  'mvp': 'mvp', 'minimum viable': 'mvp',
  'early stage': 'early-stage', 'early-stage': 'early-stage',
  'growth': 'growth', 'growth stage': 'growth',
  'scale': 'scale', 'scaling': 'scale', 'scale-up': 'scale',
  'established': 'established', 'mature': 'established',
  'exited': 'exited', 'acquired': 'exited',
}

const FUNDING_KEYWORDS: Record<string, string> = {
  'bootstrapped': 'bootstrapped', 'self-funded': 'bootstrapped',
  'pre-seed': 'pre-seed', 'preseed': 'pre-seed',
  'seed stage': 'seed', 'seed funded': 'seed', 'seed': 'seed',
  'series a': 'series-a', 'series-a': 'series-a',
  'series b': 'series-b', 'series-b': 'series-b',
  'series c': 'series-c', 'series-c': 'series-c',
  'series d': 'series-d', 'series-d': 'series-d',
  'ipo': 'ipo', 'public': 'ipo',
  'grant': 'grant', 'grant funded': 'grant', 'grant-funded': 'grant',
}

const VENTURE_TYPE_KEYWORDS: Record<string, string> = {
  'startup': 'startup', 'startups': 'startup',
  'nonprofit': 'nonprofit', 'non-profit': 'nonprofit', 'ngo': 'nonprofit',
  'student': 'student', 'student venture': 'student', 'student startup': 'student',
  'research': 'research', 'research venture': 'research',
  'open source': 'open-source', 'open-source': 'open-source', 'oss': 'open-source',
  'social enterprise': 'social-enterprise', 'social-enterprise': 'social-enterprise',
  'independent': 'independent', 'community': 'community',
}

// Comprehensive domain synonyms
const DOMAIN_SYNONYMS: Record<string, string[]> = {
  'Technology': ['tech', 'technology', 'software', 'saas', 'cloud'],
  'AI / Machine Learning': ['ai', 'ml', 'artificial intelligence', 'machine learning', 'llm', 'gpt'],
  'Robotics': ['robotics', 'robots', 'robot', 'automation'],
  'Healthcare & Life Sciences': ['healthcare', 'health', 'medical', 'medtech', 'healthtech'],
  'Biotech': ['biotech', 'biotechnology', 'life sciences', 'genomics'],
  'Finance & Insurance': ['fintech', 'finance', 'banking', 'insurance', 'wealth'],
  'Education': ['edtech', 'education', 'learning', 'training'],
  'E-Commerce & Retail': ['ecommerce', 'e-commerce', 'retail', 'commerce', 'marketplace'],
  'Food & Beverage': ['food', 'foodtech', 'beverage', 'restaurant', 'culinary'],
  'Manufacturing & Industrial': ['manufacturing', 'industrial', 'factory', 'production'],
  'Construction & Real Estate': ['construction', 'real estate', 'proptech', 'realty', 'buildings'],
  'Transportation & Logistics': ['logistics', 'transportation', 'freight', 'shipping', 'delivery'],
  'Energy & Environment': ['energy', 'climate', 'cleantech', 'renewable', 'solar', 'wind', 'green'],
  'Agriculture & Allied': ['agriculture', 'agri', 'agritech', 'farming', 'agricultural'],
  'Media & Entertainment': ['media', 'entertainment', 'streaming', 'gaming', 'music', 'film'],
  'Defense & Space': ['defense', 'defence', 'space', 'aerospace', 'spacetech', 'satellite'],
  'Automotive': ['automotive', 'auto', 'vehicles', 'cars', 'ev'],
}

// Top locations
const LOCATION_KEYWORDS = [
  'india', 'usa', 'united states', 'uk', 'united kingdom', 'japan', 'china', 'germany',
  'france', 'canada', 'australia', 'singapore', 'brazil', 'mexico', 'south korea',
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'chennai', 'hyderabad', 'pune',
  'new york', 'san francisco', 'london', 'paris', 'berlin', 'tokyo'
]

const FOUNDER_INTENT = /\b(founders?|builders?|entrepreneurs?|people|women founders?|indian founders?)\b/i
const OPPORTUNITY_INTENT = /\b(hiring|jobs?|roles?|opportunities|open positions?|looking for)\b/i

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'of', 'for', 'to', 'from', 'by', 'with',
  'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'building', 'built', 'creates', 'made', 'making', 'company', 'companies',
  'startup', 'startups', 'ventures', 'venture', 'business',
])

export function parseQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    keywords: [],
    domains: [],
    original: query,
  }

  if (!query || !query.trim()) return result

  let q = query.toLowerCase().trim()

  // 1. Detect intent
  if (FOUNDER_INTENT.test(q)) result.intent = 'founder'
  else if (OPPORTUNITY_INTENT.test(q)) {
    result.intent = 'opportunity'
    result.is_hiring = true
  }
  else result.intent = 'venture'

  // 2. Detect stage
  for (const [phrase, stage] of Object.entries(STAGE_KEYWORDS)) {
    if (q.includes(phrase)) { result.stage = stage; break }
  }

  // 3. Detect funding
  for (const [phrase, funding] of Object.entries(FUNDING_KEYWORDS)) {
    if (q.includes(phrase)) { result.funding = funding; break }
  }

  // 4. Detect venture type
  for (const [phrase, type] of Object.entries(VENTURE_TYPE_KEYWORDS)) {
    if (q.includes(phrase)) { result.venture_type = type; break }
  }

  // 5. Detect location
  for (const loc of LOCATION_KEYWORDS) {
    const pattern = new RegExp(`\\b${loc}\\b`, 'i')
    if (pattern.test(q)) {
      result.location = loc.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
      break
    }
  }

  // 6. Detect domains via synonyms
  const detectedDomains = new Set<string>()
  for (const [canonical, synonyms] of Object.entries(DOMAIN_SYNONYMS)) {
    for (const syn of synonyms) {
      const pattern = new RegExp(`\\b${syn}\\b`, 'i')
      if (pattern.test(q)) {
        detectedDomains.add(canonical)
        break
      }
    }
  }
  result.domains = Array.from(detectedDomains)

  // 7. Extract remaining keywords (clean up query)
  let residual = q
  LOCATION_KEYWORDS.forEach(k => { residual = residual.replace(new RegExp(`\\b${k}\\b`, 'gi'), ' ') })
  Object.keys(STAGE_KEYWORDS).forEach(k => { residual = residual.replace(new RegExp(`\\b${k}\\b`, 'gi'), ' ') })
  Object.keys(FUNDING_KEYWORDS).forEach(k => { residual = residual.replace(new RegExp(`\\b${k}\\b`, 'gi'), ' ') })
  Object.keys(VENTURE_TYPE_KEYWORDS).forEach(k => { residual = residual.replace(new RegExp(`\\b${k}\\b`, 'gi'), ' ') })
  
  Object.values(DOMAIN_SYNONYMS).flat().forEach(syn => {
    residual = residual.replace(new RegExp(`\\b${syn}\\b`, 'gi'), ' ')
  })

  // Remove intents
  residual = residual.replace(FOUNDER_INTENT, ' ').replace(OPPORTUNITY_INTENT, ' ')

  // Extract valid words
  const words = residual.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w))
  result.keywords = Array.from(new Set(words))

  return result
}