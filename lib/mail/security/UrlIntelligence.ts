export interface ExtractedUrlInfo {
  originalUrl: string
  normalizedUrl: string
  domain: string
  isLookalike: boolean
  targetBrand: string | null
  riskScore: number
  finalRedirectUrl?: string
  redirectCount: number
}

const PROTECTED_BRANDS = [
  { name: 'DSRT', domains: ['dsrt.com', 'dsrtai.com'] },
  { name: 'Google', domains: ['google.com', 'gmail.com'] },
  { name: 'Microsoft', domains: ['microsoft.com', 'outlook.com', 'live.com'] },
  { name: 'GitHub', domains: ['github.com'] },
  { name: 'Supabase', domains: ['supabase.com', 'supabase.co'] },
]

/**
 * Computes Levenshtein distance between two strings.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

/**
 * Normalizes a URL for canonical matching.
 */
export function normalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim())
    parsed.hash = '' // Strip anchor fragments
    // Strip common tracking parameters
    parsed.searchParams.delete('utm_source')
    parsed.searchParams.delete('utm_medium')
    parsed.searchParams.delete('utm_campaign')
    parsed.searchParams.delete('fbclid')
    parsed.searchParams.delete('gclid')
    return parsed.toString().toLowerCase()
  } catch {
    return rawUrl.trim().toLowerCase()
  }
}

/**
 * Detects if a domain is a lookalike/homoglyph of protected brand domains.
 */
function checkLookalikeDomain(domain: string): { isLookalike: boolean; targetBrand: string | null } {
  const cleanDomain = domain.toLowerCase().replace(/^www\./, '')

  for (const brand of PROTECTED_BRANDS) {
    if (brand.domains.includes(cleanDomain)) {
      return { isLookalike: false, targetBrand: brand.name } // Exact legitimate match
    }

    for (const legitDomain of brand.domains) {
      const dist = levenshteinDistance(cleanDomain, legitDomain)
      if (dist > 0 && dist <= 2) {
        return { isLookalike: true, targetBrand: brand.name } // 1 or 2 character edit distance lookalike
      }
    }
  }

  return { isLookalike: false, targetBrand: null }
}

/**
 * Safely traces HTTP redirect chains with a strict timeout (max 2 hops, 1.5s timeout).
 */
async function traceRedirectChain(url: string): Promise<{ finalUrl: string; count: number }> {
  let currentUrl = url
  let count = 0
  const maxHops = 2

  while (count < maxHops) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 1500)

      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const location = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).toString()
        count++
      } else {
        break
      }
    } catch {
      break // Abort or connection error — halt chain safely
    }
  }

  return { finalUrl: currentUrl, count }
}

/**
 * Extracts and inspects all URLs in body HTML/text.
 */
export async function analyzeUrls(bodyHtml: string, bodyText: string): Promise<ExtractedUrlInfo[]> {
  const combined = `${bodyHtml || ''} ${bodyText || ''}`
  const urlRegex = /(https?:\/\/[^\s<"'>]+)/gi
  const rawMatches = combined.match(urlRegex) || []

  // Deduplicate raw URLs
  const uniqueUrls = Array.from(new Set(rawMatches)).slice(0, 15) // Max 15 URLs per inspection
  const results: ExtractedUrlInfo[] = []

  for (const rawUrl of uniqueUrls) {
    let domain = ''
    try {
      domain = new URL(rawUrl).hostname.toLowerCase()
    } catch {
      continue // Skip invalid URLs
    }

    const normalized = normalizeUrl(rawUrl)
    const lookalike = checkLookalikeDomain(domain)
    const redirects = await traceRedirectChain(normalized)

    let riskScore = 0.0000
    if (lookalike.isLookalike) riskScore += 0.8500
    if (redirects.count > 1) riskScore += 0.2000
    if (domain.includes('free') || domain.includes('login') || domain.includes('verify')) riskScore += 0.1500

    results.push({
      originalUrl: rawUrl,
      normalizedUrl: normalized,
      domain,
      isLookalike: lookalike.isLookalike,
      targetBrand: lookalike.targetBrand,
      riskScore: Math.min(1.0000, Number(riskScore.toFixed(4))),
      finalRedirectUrl: redirects.finalUrl !== normalized ? redirects.finalUrl : undefined,
      redirectCount: redirects.count,
    })
  }

  return results
}