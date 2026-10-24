import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const opportunity_id = sp.get('opportunity_id')
  const application_id = sp.get('application_id')
  const category = sp.get('category')
  const action = sp.get('action')
  const actor_id = sp.get('actor_id')
  const since = sp.get('since')
  const until = sp.get('until')
  const q = sp.get('q')
  const limit = Math.min(parseInt(sp.get('limit') || '100'), 500)
  const cursor = sp.get('cursor') // seq

  let query = supabase
    .from('compliance_audit_log')
    .select('id, seq, action, category, entity_type, entity_id, opportunity_id, application_id, actor_id, actor_role, source, reason, created_at, metadata, prev_hash, row_hash')
    .order('seq', { ascending: false })
    .limit(limit + 1)

  if (opportunity_id) query = query.eq('opportunity_id', opportunity_id)
  if (application_id) query = query.eq('application_id', application_id)
  if (category) query = query.eq('category', category)
  if (action) query = query.eq('action', action)
  if (actor_id) query = query.eq('actor_id', actor_id)
  if (since) query = query.gte('created_at', since)
  if (until) query = query.lte('created_at', until)
  if (cursor) query = query.lt('seq', parseInt(cursor))
  if (q) query = query.or(`action.ilike.%${q}%,reason.ilike.%${q}%,entity_type.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = data || []
  const hasMore = list.length > limit
  const trimmed = hasMore ? list.slice(0, limit) : list
  const nextCursor = hasMore ? trimmed[trimmed.length - 1].seq : null

  return NextResponse.json({ entries: trimmed, next_cursor: nextCursor, has_more: hasMore })
}