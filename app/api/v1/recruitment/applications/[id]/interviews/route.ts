import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { scheduleInterview } from '@/lib/recruitment/service.interviews'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    const interview = await scheduleInterview(
      supabase,
      ctx.identityId,
      { ...body, application_id: id },
      ctx.requestId
    )

    return ok({ interview }, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}