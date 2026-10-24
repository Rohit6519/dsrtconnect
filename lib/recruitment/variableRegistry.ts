import type { RenderContext } from './types'

/**
 * Every registered variable ("resolver") returns a string OR null (null = unavailable in this context).
 * The engine will substitute empty string when null AND record it as a "missing" variable
 * so template authors can see what didn't resolve.
 */
export type VariableResolver = (
  ctx: RenderContext,
  data: ResolverData
) => Promise<string | null> | string | null

export interface ResolverData {
  candidate: any
  opportunity: any
  venture: any
  project: any
  recruiter: any
  application: any
  organization: any
}

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://dsrt.ai'

function firstName(full?: string | null): string | null {
  if (!full) return null
  return String(full).trim().split(/\s+/)[0] || null
}

const STAGE_LABEL: Record<string, string> = {
  applied: 'Submitted',
  submitted: 'Submitted',
  pending: 'Pending',
  reviewing: 'Under review',
  screening: 'Shortlisted',
  interviewing: 'Interview',
  offered: 'Offer',
  hired: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

export const VARIABLE_RESOLVERS: Record<string, VariableResolver> = {
  // ─── candidate ───
  'candidate.first_name':  (_c, d) => firstName(d.candidate?.full_name) || d.candidate?.username || null,
  'candidate.full_name':   (_c, d) => d.candidate?.full_name || d.candidate?.username || null,
  'candidate.username':    (_c, d) => d.candidate?.username ? `@${d.candidate.username}` : null,
  'candidate.profile_url': (_c, d) => d.candidate?.username ? `${APP_ORIGIN}/profile/${d.candidate.username}` : null,

  // ─── opportunity ───
  'opportunity.title':        (_c, d) => d.opportunity?.title || null,
  'opportunity.number':       (_c, d) => d.opportunity?.opportunity_number || null,
  'opportunity.type':         (_c, d) => {
    const t = d.opportunity?.opportunity_type
    return t ? String(t).replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()) : null
  },
  'opportunity.url':          (_c, d) => d.opportunity?.slug
    ? `${APP_ORIGIN}/looking-for/${d.opportunity.slug}`
    : d.opportunity?.id ? `${APP_ORIGIN}/looking-for/${d.opportunity.id}` : null,
  'opportunity.location':     (_c, d) => {
    const wm = d.opportunity?.work_mode
    const loc = d.opportunity?.location
    if (wm && loc) return `${loc} (${wm})`
    return loc || wm || null
  },
  'opportunity.time_commitment': (_c, d) => {
    const hrs = d.opportunity?.hours_per_week
    const tc  = d.opportunity?.time_commitment
    if (hrs) return `${hrs} hrs/week`
    return tc || null
  },

  // ─── venture / project ───
  'venture.name':    (_c, d) => d.venture?.name || null,
  'venture.tagline': (_c, d) => d.venture?.tagline || null,
  'project.name':    (_c, d) => d.project?.name || null,

  // ─── recruiter ───
  'recruiter.name':       (_c, d) => d.recruiter?.full_name || d.recruiter?.username || 'The team',
  'recruiter.first_name': (_c, d) => firstName(d.recruiter?.full_name) || d.recruiter?.username || 'The team',
  'recruiter.username':   (_c, d) => d.recruiter?.username ? `@${d.recruiter.username}` : null,

  // ─── interview (may be null when not scheduled) ───
  'interview.date':     (c) => c.interview?.date || null,
  'interview.time':     (c) => c.interview?.time || null,
  'interview.link':     (c) => c.interview?.link || null,
  'interview.duration': (c) => c.interview?.duration_min ? `${c.interview.duration_min} minutes` : null,

  // ─── offer ───
  'offer.compensation': (c) => c.offer?.compensation || null,
  'offer.start_date':   (c) => c.offer?.start_date || null,

  // ─── system + application ───
  'application.stage':     (_c, d) => STAGE_LABEL[d.application?.pipeline_stage] || d.application?.pipeline_stage || null,
  'application.next_step': (c) => c.next_step_label || null,
  'system.brand':          () => 'DSRT Connect',
  'system.date':           () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
}

/** Substitute {{key}} tokens. Unknown tokens → empty string but recorded. */
export function renderText(text: string, values: Record<string, string | null>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
    const v = values[key]
    return v == null ? '' : v
  })
}