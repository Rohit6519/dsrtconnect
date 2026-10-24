import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// POST /api/looking-for/[id]/report
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { source_type = 'team_up', reason, details } = body

  if (!reason) return NextResponse.json({ error: 'Reason required' }, { status: 400 })

  const { data, error } = await supabase.from('team_up_reports').insert({
    source_type, source_id: id,
    reporter_id: user.id, reason, details,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report: data }, { status: 201 })
}
