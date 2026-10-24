import type { PipelineStage } from './types'

/**
 * Minimum viable template preview.
 * In Phase 3 the real TemplateEngine (org overrides + full variable graph)
 * will replace this. Signatures stay the same so nothing downstream breaks.
 */
export interface PreviewContext {
  opportunity_title: string
  opportunity_slug?: string | null
  applicant_first_name: string
  applicant_full_name: string
  sender_name?: string
  organization_name?: string | null
}

export function subjectForStage(stage: PipelineStage, ctx: PreviewContext): string {
  const t = ctx.opportunity_title
  switch (stage) {
    case 'reviewing':    return `Your application is now under review — ${t}`
    case 'screening':    return `You've been shortlisted for ${t}`
    case 'interviewing': return `Interview stage — ${t}`
    case 'offered':      return `You have an offer — ${t}`
    case 'hired':        return `Welcome aboard — ${t}`
    case 'rejected':     return `Update on your application — ${t}`
    case 'withdrawn':    return `Application withdrawn — ${t}`
    default:             return `Update on your application — ${t}`
  }
}

export function bodyForStage(stage: PipelineStage, ctx: PreviewContext): string {
  const name = ctx.applicant_first_name || ctx.applicant_full_name || 'there'
  const t = ctx.opportunity_title
  const org = ctx.organization_name || ctx.sender_name || 'the team'

  switch (stage) {
    case 'reviewing':
      return [
        `Hi ${name},`,
        ``,
        `Quick update — your application for "${t}" has moved into review. ${org} is going through the submissions now.`,
        ``,
        `We'll get back to you as soon as there's a next step.`,
        ``,
        `— ${org}`,
      ].join('\n')

    case 'screening':
      return [
        `Hi ${name},`,
        ``,
        `Good news — you've been shortlisted for "${t}". ${org} enjoyed your application and would like to move forward.`,
        ``,
        `We'll follow up with the next step shortly. If you have questions, just reply to this message.`,
        ``,
        `— ${org}`,
      ].join('\n')

    case 'interviewing':
      return [
        `Hi ${name},`,
        ``,
        `${org} would like to invite you to interview for "${t}".`,
        ``,
        `We'll send scheduling details in a follow-up. In the meantime, please share your general availability by replying to this message.`,
        ``,
        `— ${org}`,
      ].join('\n')

    case 'offered':
      return [
        `Hi ${name},`,
        ``,
        `${org} is preparing an offer for the "${t}" role. Full details are on the way in a separate message.`,
        ``,
        `Please stand by and reach out if you have any immediate questions.`,
        ``,
        `— ${org}`,
      ].join('\n')

    case 'hired':
      return [
        `Hi ${name},`,
        ``,
        `Congratulations — you've been selected for "${t}". ${org} is excited to welcome you aboard.`,
        ``,
        `Onboarding details will follow shortly.`,
        ``,
        `— ${org}`,
      ].join('\n')

    case 'rejected':
      return [
        `Hi ${name},`,
        ``,
        `Thank you for applying to "${t}". After careful review, ${org} has decided to move forward with other candidates for this role.`,
        ``,
        `We genuinely appreciate the time you put into your application, and wish you the very best in what you're building next.`,
        ``,
        `— ${org}`,
      ].join('\n')

    default:
      return `Hi ${name},\n\nThere's an update on your application for "${t}".\n\n— ${org}`
  }
}

/** First name best-effort split */
export function firstNameOf(full: string | null | undefined): string {
  if (!full) return ''
  return String(full).trim().split(/\s+/)[0] || ''
}