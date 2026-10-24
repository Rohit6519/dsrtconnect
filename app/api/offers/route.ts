import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OfferService } from '@/lib/offers/OfferService'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sp = new URL(req.url).searchParams
  const application_id = sp.get('application_id')
  const opportunity_id = sp.get('opportunity_id')

  let q = supabase.from('offers').select('*').order('created_at', { ascending: false })
  if (application_id) q = q.eq('application_id', application_id)
  if (opportunity_id) q = q.eq('opportunity_id', opportunity_id)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ offers: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  try {
    const offer = await OfferService.prepareOffer(body, user.id)
    return NextResponse.json({ offer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to prepare offer' }, { status: 400 })
  }
}