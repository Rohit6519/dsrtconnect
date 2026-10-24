import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/recruitment/templates?opportunity_id=...&scope=all|effective
 *   - scope=effective (default): returns the merged/effective template per key
 *     (opp override > org override > global). Perfect for the settings UI.
 *   - scope=all: returns every template row (owner + globals) for advanced views.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const opportunityId = sp.get('opportunity_id')
  const scopeMode = sp.get('scope') || 'effective'

  // Load all globals
  const { data: globals } = await supabase
    .from('recruitment_templates')
    .select('*')
    .eq('scope', 'global')
    .eq('is_active', true)
    .order('category, template_key')

  // Load owner overrides for this opportunity
  let oppOverrides: any[] = []
  if (opportunityId) {
    const { data } = await supabase
      .from('recruitment_templates')
      .select('*')
      .eq('scope', 'opportunity')
      .eq('opportunity_id', opportunityId)
    oppOverrides = data || []
  }

  if (scopeMode === 'all') {
    return NextResponse.json({
      templates: [...(globals || []), ...oppOverrides],
    })
  }

  // Effective: for each template_key present in globals, prefer opp override
  const byKey = new Map<string, any>()
  for (const g of globals || []) byKey.set(g.template_key, { ...g, effective_scope: 'global', override_id: null })
  for (const o of oppOverrides) {
    byKey.set(o.template_key, { ...o, effective_scope: 'opportunity', override_id: o.id })
  }

  return NextResponse.json({
    templates: Array.from(byKey.values()),
  })
}

/**
 * POST /api/recruitment/templates
 * body: { template_key, opportunity_id, name?, subject, body_markdown, send_mode? }
 * Creates an opportunity-scoped override for an existing template_key.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    template_key,
    opportunity_id,
    name,
    description,
    subject,
    body_markdown,
    send_mode,
    category,
  } = body

  if (!template_key || !opportunity_id || !subject || !body_markdown) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Verify owner
  const { data: opp } = await supabase
    .from('opportunities')
    .select('id, poster_user_id, title')
    .eq('id', opportunity_id)
    .single()
  if (!opp || opp.poster_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Verify the template_key exists in globals (safety: prevents typo templates)
  const { data: baseline } = await supabase
    .from('recruitment_templates')
    .select('template_key, name, category')
    .eq('scope', 'global')
    .eq('template_key', template_key)
    .maybeSingle()
  if (!baseline) {
    return NextResponse.json({ error: 'Unknown template_key' }, { status: 400 })
  }

  // Upsert opportunity override
  const { data: existing } = await supabase
    .from('recruitment_templates')
    .select('id, version')
    .eq('scope', 'opportunity')
    .eq('opportunity_id', opportunity_id)
    .eq('template_key', template_key)
    .maybeSingle()

  const payload = {
    template_key,
    scope: 'opportunity',
    opportunity_id,
    organization_id: null,
    name: name || `${baseline.name} (custom)`,
    description: description || null,
    subject,
    body_markdown,
    send_mode: send_mode || 'automatic',
    is_active: true,
    is_default: false,
    is_system: false,
    category: category || baseline.category || 'stage',
    language: 'en',
    updated_by: user.id,
  }

  if (existing) {
    const nextVersion = (existing.version || 1) + 1
    // Save previous version before update
    const { data: prev } = await supabase
      .from('recruitment_templates')
      .select('subject, body_markdown, send_mode, version')
      .eq('id', existing.id)
      .single()

    if (prev) {
      await supabase.from('recruitment_template_versions').insert({
        template_id: existing.id,
        version: prev.version,
        subject: prev.subject,
        body_markdown: prev.body_markdown,
        send_mode: prev.send_mode,
        updated_by: user.id,
      })
    }

    const { data: updated, error } = await supabase
      .from('recruitment_templates')
      .update({ ...payload, version: nextVersion })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ template: updated })
  }

  const { data: inserted, error } = await supabase
    .from('recruitment_templates')
    .insert({ ...payload, created_by: user.id, version: 1 })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ template: inserted })
}