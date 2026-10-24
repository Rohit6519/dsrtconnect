import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateSteps } from '@/lib/automation/RuleRegistry'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sp = new URL(req.url).searchParams
  const opportunity_id = sp.get('opportunity_id')
  const include_templates = sp.get('templates') === '1'

  let q = supabase.from('workflow_rules').select('*').order('created_at', { ascending: false })
  if (opportunity_id) q = q.or(`opportunity_id.eq.${opportunity_id},opportunity_id.is.null`)
  else q = q.eq('owner_id', user.id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let rules = data || []
  if (!include_templates) rules = rules.filter(r => !r.is_template)

  return NextResponse.json({ rules })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => ({}))

  if (!body.name || !body.trigger_type) {
    return NextResponse.json({ error: 'name and trigger_type required' }, { status: 400 })
  }
  const err = validateSteps(body.steps || [])
  if (err) return NextResponse.json({ error: err }, { status: 400 })

  const { data, error } = await supabase.from('workflow_rules').insert({
    owner_id: user.id,
    opportunity_id: body.opportunity_id || null,
    organization_id: body.organization_id || null,
    name: String(body.name).slice(0, 200),
    description: body.description ? String(body.description).slice(0, 2000) : null,
    trigger_type: body.trigger_type,
    trigger_config: body.trigger_config || {},
    steps: body.steps || [],
    is_active: body.is_active !== false,
    is_system: false, is_template: false,
    created_by: user.id, updated_by: user.id,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rule: data })
}