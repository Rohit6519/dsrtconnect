import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OfferService } from '@/lib/offers/OfferService'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  try {
    const offer = await OfferService.sendOffer(id, user.id, body.custom_message)
    return NextResponse.json({ offer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to send offer' }, { status: 400 })
  }
}