import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, NotFoundError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx
  try {
    const { id } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: listing } = await supabase
      .from('looking_for_listings')
      .select('*, communities(name, slug)')
      .eq('id', id)
      .maybeSingle()

    if (!listing) throw new NotFoundError('Listing', id)

    return ok({ listing }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}