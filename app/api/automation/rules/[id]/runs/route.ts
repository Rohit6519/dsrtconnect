import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: runs } = await supabase.from('workflow_rule_runs')
    .select('*').eq('rule_id', id).order('started_at', { ascending: false }).limit(50)
  const runIds = (runs || []).map(r => r.id)
  const { data: steps } = runIds.length
    ? await supabase.from('workflow_rule_run_steps').select('*').in('run_id', runIds).order('step_index')
    : { data: [] }
  const byRun = new Map<string, any[]>()
  for (const s of steps || []) {
    if (!byRun.has(s.run_id)) byRun.set(s.run_id, [])
    byRun.get(s.run_id)!.push(s)
  }
  return NextResponse.json({ runs: (runs || []).map(r => ({ ...r, steps: byRun.get(r.id) || [] })) })
}