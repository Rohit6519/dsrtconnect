import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: req } = await supabase.from('compliance_export_requests').select('*').eq('id', id).single()
  if (!req) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (req.requested_by !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (req.status !== 'ready') return NextResponse.json({ error: 'Not ready', status: req.status }, { status: 409 })

  return NextResponse.json({ url: req.result_url, bytes: req.result_bytes, expires_at: req.expires_at })
}