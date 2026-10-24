import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditChain } from '@/lib/compliance/AuditChain'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const from_seq = body.from_seq ? Number(body.from_seq) : null
  const limit = Math.min(Number(body.limit || 2000), 5000)

  const result = await AuditChain.verifyRange(from_seq, limit)
  return NextResponse.json(result)
}