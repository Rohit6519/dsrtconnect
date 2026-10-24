export type EvidenceLevel = 'strong' | 'partial' | 'missing'

export interface Evidence {
  requirement: string
  level: EvidenceLevel
  reasons: string[]
}

const norm = (s: string) => s.trim().toLowerCase()

/**
 * Build per-requirement evidence from applicant + application data.
 * Deterministic string matching only — no AI.
 */
export function buildRequirementEvidence(input: {
  required_skills?: string[] | null
  preferred_skills?: string[] | null
  applicant?: {
    profile_tags?: string[] | null
    tagline?: string | null
    bio?: string | null
  } | null
  application?: {
    highlighted_skills?: string[] | null
    cover_letter?: string | null
    cover_message?: string | null
    portfolio_url?: string | null
    github_url?: string | null
  } | null
}): Evidence[] {
  const req = (input.required_skills || []).map(String)
  const applicant = input.applicant || {}
  const app = input.application || {}

  const tags = new Set(((applicant.profile_tags || []) as string[]).map(norm))
  const highlighted = new Set(
    ((app.highlighted_skills || []) as string[]).map(norm)
  )
  const text = norm(
    [
      applicant.tagline || '',
      applicant.bio || '',
      app.cover_letter || '',
      app.cover_message || '',
    ].join(' ')
  )

  return req.map((raw) => {
    const skill = raw
    const key = norm(skill)
    const reasons: string[] = []
    let level: EvidenceLevel = 'missing'

    if (highlighted.has(key)) {
      reasons.push('Highlighted in application')
      level = 'strong'
    }
    if (tags.has(key)) {
      reasons.push('Listed in profile skills')
      level = 'strong'
    }
    if (text.includes(key)) {
      if (!reasons.includes('Mentioned in application text')) {
        reasons.push('Mentioned in application text')
      }
      // Only upgrade missing → partial; never downgrade strong
      if (level === 'missing') level = 'partial'
    }

    if (reasons.length === 0) {
      reasons.push('No evidence found in profile or application')
      level = 'missing'
    }

    return { requirement: skill, level, reasons }
  })
}