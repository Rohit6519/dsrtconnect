import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { writeOpportunityAudit } from '@/lib/events/opportunity-events'

export const dynamic = 'force-dynamic'

const VALID_TYPES = ['search', 'recommendations', 'community', 'project', 'venture', 'public_link', 'looking_for']

async function assertManager(supabase: any, userId: string, oppId: string) {
  const { data: opp } = await supabase
    .from('opportunities')
    .select('poster_user_id')
    .eq('id', oppId)
    .single()
  if (!opp) return { ok: false, code: 404 }
  if (opp.poster_user_id === userId) return { ok: true }
  const { data: m } = await supabase
    .from('opportunity_members')
    .select('role')
    .eq('opportunity_id', oppId)
    .eq('user_id', userId)
    .maybeSingle()
  if (m && ['owner', 'admin', 'manager'].includes((m as any).role)) return { ok: true }
  return { ok: false, code: 403 }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const { data, error } = await supabase
    .from('opportunity_distribution')
    .select('*')
    .eq('opportunity_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ distribution: data || [] })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const body = await req.json().catch(() => ({}))
  const destination_type = String(body.destination_type || '')
  const destination_id = body.destination_id || null
  if (!VALID_TYPES.includes(destination_type)) {
    return NextResponse.json({ error: 'Invalid destination_type' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('opportunity_distribution')
      .upsert({
        opportunity_id: id,
        destination_type,
        destination_id,
        status: 'active',
        created_by: user.id,
        published_at: new Date().toISOString(),
      }, { onConflict: 'opportunity_id,destination_type,destination_id' })
      .select()
      .single()

    if (error) throw error

    await writeOpportunityAudit({
      opportunity_id: id,
      actor_id: user.id,
      action: 'distribution_added',
      target_type: 'distribution',
      target_id: data.id,
      after_state: { destination_type, destination_id },
    }).catch(() => {})

    return NextResponse.json({ distribution: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertManager(supabase, user.id, id)
  if (!gate.ok) return NextResponse.json({ error: gate.code === 404 ? 'Not found' : 'Forbidden' }, { status: gate.code })

  const sp = new URL(req.url).searchParams
  const distributionId = sp.get('distribution_id')
  if (!distributionId) return NextResponse.json({ error: 'distribution_id required' }, { status: 400 })

  const { error } = await supabase
    .from('opportunity_distribution')
    .delete()
    .eq('id', distributionId)
    .eq('opportunity_id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeOpportunityAudit({
    opportunity_id: id,
    actor_id: user.id,
    action: 'distribution_removed',
    target_type: 'distribution',
    target_id: distributionId,
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}