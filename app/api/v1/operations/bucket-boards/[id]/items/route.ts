import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { addItemToBoard } from '@/lib/operations/service.buckets'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const item = await addItemToBoard(supabase, ctx.identityId, { ...body, board_id: id })
    return ok({ item }, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}