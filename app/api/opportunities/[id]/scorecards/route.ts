import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DEFAULT_CRITERIA = [
  { key: 'technical',     label: 'Technical ability',   weight: 1, description: 'Depth in the required skill areas.' },
  { key: 'problem_solving', label: 'Problem solving',   weight: 1, description: 'Approach, structure, tradeoffs.' },
  { key: 'communication', label: 'Communication',       weight: 1, description: 'Clarity, listening, articulation.' },
  { key: 'experience',    label: 'Relevant experience', weight: 1, description: 'Prior work applicable to this role.' },
  { key: 'culture_fit',   label: 'Team / culture fit',  weight: 1, description: 'Ownership, collaboration, alignment.' },
]

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  let { data } = await supabase
    .from('interview_scorecards')
    .select('*')
    .eq('opportunity_id', id)
    .eq('kind', 'default')
    .maybeSingle()

  if (!data) {
    const insert = await supabase.from('interview_scorecards').insert({
      opportunity_id: id, kind: 'default', criteria: DEFAULT_CRITERIA, is_default: true,
    }).select().single()
    data = insert.data
  }
  return NextResponse.json({ scorecard: data })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json().catch(() => ({}))
  const { criteria } = body
  if (!Array.isArray(criteria)) return NextResponse.json({ error: 'criteria required' }, { status: 400 })

  const { data, error } = await supabase.from('interview_scorecards').upsert({
    opportunity_id: id, kind: 'default', criteria, is_default: true,
  }, { onConflict: 'opportunity_id,kind' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ scorecard: data })
}