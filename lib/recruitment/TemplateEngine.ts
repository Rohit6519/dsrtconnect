import { createClient } from '@/lib/supabase/server'
import { resolveTemplate } from './TemplateResolver'
import { VARIABLE_RESOLVERS, renderText } from './variableRegistry'
import type { RenderContext, RenderedTemplate, RecruitmentTemplate } from './types'

export class TemplateEngine {
  /**
   * Render a template by key against a live application context.
   * Falls back to inline override subject/body if provided (from drawer).
   */
  static async render(
    template_key: string,
    ctx: RenderContext
  ): Promise<RenderedTemplate> {
    const supabase = await createClient()

    // 1. Load application + related entities
    const { data: app } = await supabase
      .from('opportunity_applications')
      .select('id, opportunity_id, applicant_id, applicant_snapshot, pipeline_stage')
      .eq('id', ctx.application_id)
      .single()

    if (!app) throw new Error(`Application not found: ${ctx.application_id}`)

    const [oppRes, candidateRes, recruiterRes] = await Promise.all([
      supabase
        .from('opportunities')
        .select('id, title, slug, opportunity_number, opportunity_type, work_mode, location, time_commitment, hours_per_week, poster_user_id, project_id, venture_id, organization_id')
        .eq('id', app.opportunity_id)
        .single(),
      supabase
        .from('users')
        .select('id, username, full_name, avatar_url')
        .eq('id', app.applicant_id)
        .maybeSingle(),
      // recruiter = opp poster
      null,
    ])

    const opp = oppRes.data as any
    if (!opp) throw new Error('Opportunity no longer exists')

    const { data: recruiter } = await supabase
      .from('users')
      .select('id, username, full_name, avatar_url')
      .eq('id', opp.poster_user_id)
      .maybeSingle()

    const [ventureRes, projectRes] = await Promise.all([
      opp.venture_id
        ? supabase.from('ventures').select('id, name, slug, tagline').eq('id', opp.venture_id).maybeSingle()
        : Promise.resolve({ data: null }),
      opp.project_id
        ? supabase.from('projects').select('id, name, slug, icon').eq('id', opp.project_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    // Fall back to snapshot if live user row missing
    const candidate = candidateRes.data || (app.applicant_snapshot as any) || null

    // 2. Resolve template (hierarchy)
    let template: RecruitmentTemplate | null = null
    let scope_used: RenderedTemplate['scope_used'] = 'global'

    const resolved = await resolveTemplate({
      template_key,
      opportunity_id: opp.id,
      organization_id: opp.organization_id,
    })
    if (resolved) {
      template = resolved.template
      scope_used = resolved.scope_used
    }

    // 3. Determine effective subject + body (override wins)
    let subject: string
    let body: string
    const usedOverride = !!(ctx.override_subject || ctx.override_body)

    if (ctx.override_subject && ctx.override_body) {
      subject = ctx.override_subject
      body = ctx.override_body
      scope_used = 'override'
    } else if (template) {
      subject = ctx.override_subject || template.subject
      body = ctx.override_body || template.body_markdown
    } else {
      // No template AND no override — fallback minimum
      subject = `Update on your application`
      body = `Hi there,\n\nThere's an update on your application. Please check your DSRT dashboard for details.\n\n— DSRT Connect`
    }

    // 4. Substitute variables
    const values: Record<string, string | null> = {}
    const missing: string[] = []
    const requiredKeys = collectTokens(`${subject}\n${body}`)

    for (const key of requiredKeys) {
      const resolver = VARIABLE_RESOLVERS[key]
      if (!resolver) {
        missing.push(key)
        values[key] = null
        continue
      }
      const v = await resolver(ctx, {
        candidate,
        opportunity: opp,
        venture: ventureRes.data,
        project: projectRes.data,
        recruiter,
        application: app,
        organization: null,
      })
      if (v == null || v === '') missing.push(key)
      values[key] = v
    }

    const renderedSubject = renderText(subject, values).trim()
    const renderedBody = renderText(body, values).trim()

    // 5. Log render (fire-and-forget; never blocks send)
    supabase.from('recruitment_template_render_log').insert({
      template_id: template?.id || null,
      template_key,
      scope_used,
      application_id: app.id,
      opportunity_id: opp.id,
      variables_used: values,
      variables_missing: missing,
      rendered_subject: renderedSubject.slice(0, 500),
      rendered_body: renderedBody.slice(0, 5000),
      used_override: usedOverride,
    }).then(() => {}, () => {})

    return {
      template_id: template?.id || null,
      template_key,
      scope_used,
      subject: renderedSubject,
      body_markdown: renderedBody,
      variables_used: values,
      variables_missing: missing,
      used_override: usedOverride,
    }
  }

  /**
   * Preview mode — used by the template editor and the drawer preview.
   * No log entry. Uses provided subject/body directly.
   */
  static async preview(params: {
    template_key: string
    subject: string
    body_markdown: string
    application_id?: string
    opportunity_id?: string
  }): Promise<{ subject: string; body: string; missing: string[]; values: Record<string, string | null> }> {
    // If no application context, use synthetic sample data
    if (!params.application_id || !params.opportunity_id) {
      const values = sampleValues()
      return {
        subject: renderText(params.subject, values),
        body: renderText(params.body_markdown, values),
        missing: [],
        values,
      }
    }
    const rendered = await this.render(params.template_key, {
      application_id: params.application_id,
      opportunity_id: params.opportunity_id,
      override_subject: params.subject,
      override_body: params.body_markdown,
    })
    return {
      subject: rendered.subject,
      body: rendered.body_markdown,
      missing: rendered.variables_missing,
      values: rendered.variables_used,
    }
  }
}

function collectTokens(text: string): string[] {
  const s = new Set<string>()
  const re = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) s.add(m[1])
  return Array.from(s)
}

function sampleValues(): Record<string, string> {
  return {
    'candidate.first_name': 'Alex',
    'candidate.full_name': 'Alex Ryder',
    'candidate.username': '@alex',
    'candidate.profile_url': 'https://dsrt.ai/profile/alex',
    'opportunity.title': 'Sample Opportunity',
    'opportunity.number': 'OPP-000000',
    'opportunity.type': 'Freelance',
    'opportunity.url': 'https://dsrt.ai/looking-for/sample',
    'opportunity.location': 'Remote',
    'opportunity.time_commitment': '20 hrs/week',
    'venture.name': 'Sample Venture',
    'venture.tagline': 'A pretend company',
    'project.name': 'Sample Project',
    'recruiter.name': 'The Team',
    'recruiter.first_name': 'Sam',
    'recruiter.username': '@sample',
    'interview.date': 'Sep 12, 2026',
    'interview.time': '7:00 PM IST',
    'interview.link': 'https://meet.example.com/xyz',
    'interview.duration': '45 minutes',
    'offer.compensation': '$5,000 / month',
    'offer.start_date': 'Oct 1, 2026',
    'application.stage': 'Shortlisted',
    'application.next_step': 'Request availability',
    'system.brand': 'DSRT Connect',
    'system.date': new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  }
}