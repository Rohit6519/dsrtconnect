import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'
import { getBucketCommunities, CommunityBucket } from '@/lib/community/network'

export const dynamic = 'force-dynamic'

const ALLOWED: CommunityBucket[] = ['joined', 'following', 'invited', 'past']

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const bucket = (req.nextUrl.searchParams.get('bucket') as CommunityBucket) || 'joined'
    if (!ALLOWED.includes(bucket)) {
      return ok({ items: [], bucket }, { ctx })
    }
    const items = await getBucketCommunities(supabase, ctx.identityId, bucket)
    return ok({ items, bucket }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}