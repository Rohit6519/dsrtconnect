import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_REASONS = [
  'spam', 'misleading', 'inappropriate', 'fraudulent',
  'impersonation', 'irrelevant', 'suspicious-compensation', 'other'
]

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { reason, details } = body

  if (!reason || !VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Invalid reason' }, { status: 400 })
  }

  try {
    const { error } = await supabase.from('opportunity_reports').insert({
      opportunity_id: id,
      reporter_id: user.id,
      reason,
      details: details?.trim().slice(0, 2000) || null,
      status: 'pending',
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}