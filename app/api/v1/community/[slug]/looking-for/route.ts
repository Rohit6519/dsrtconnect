import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'
import { createListing } from '@/lib/looking-for/service.listings'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const { data: items } = await supabase
      .from('looking_for_listings')
      .select('*')
      .eq('community_id', community.id)
      .eq('status', 'PUBLISHED')
      .order('created_at', { ascending: false })

    return ok({ items: items || [] }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const body = await req.json().catch(() => ({}))
    const result = await createListing(supabase, ctx.identityId, { ...body, community_id: community.id }, ctx.requestId)
    return ok(result, { ctx, status: 201 })
  } catch (err) {
    return fail(err, ctx)
  }
}