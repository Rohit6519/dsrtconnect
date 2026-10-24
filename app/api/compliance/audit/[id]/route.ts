import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuditChain } from '@/lib/compliance/AuditChain'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: entry } = await supabase.from('compliance_audit_log').select('*').eq('id', id).single()
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const integrity = await AuditChain.verifySingle(id)

  return NextResponse.json({ entry, integrity })
}