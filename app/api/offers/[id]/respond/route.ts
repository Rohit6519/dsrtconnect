import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { OfferService } from '@/lib/offers/OfferService'
import { getRequestContext } from '@/lib/compliance/requestContext'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const reqCtx = await getRequestContext(req)
  if (!reqCtx.actor_id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action, signature_name, reason, note } = body

  try {
    if (action === 'accept') {
      if (!signature_name?.trim()) return NextResponse.json({ error: 'Digital signature required' }, { status: 400 })
      const offer = await OfferService.acceptOffer({
        offer_id: id,
        candidate_id: reqCtx.actor_id,
        signature_name: signature_name.trim(),
        ip: reqCtx.actor_ip,
        user_agent: reqCtx.actor_user_agent,
      })
      return NextResponse.json({ offer })
    }

    if (action === 'decline') {
      const offer = await OfferService.declineOffer({
        offer_id: id,
        candidate_id: reqCtx.actor_id,
        reason,
        note,
      })
      return NextResponse.json({ offer })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to respond to offer' }, { status: 400 })
  }
}