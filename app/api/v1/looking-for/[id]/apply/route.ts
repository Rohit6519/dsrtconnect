import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { submitListingApplication } from '@/lib/looking-for/service.applications'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    const result = await submitListingApplication(
      supabase,
      ctx.identityId,
      { ...body, listing_id: id },
      ctx.requestId
    )

    return ok(result, { ctx, eventId: result.event_id, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}