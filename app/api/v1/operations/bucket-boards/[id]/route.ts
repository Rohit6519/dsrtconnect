import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail } from '@/lib/kernel'
import { getBoardWithItems } from '@/lib/operations/service.buckets'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()
    const data = await getBoardWithItems(supabase, id)
    return ok(data, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}