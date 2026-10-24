import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    let communityId = slug
    if (!slug.includes('-') || slug.length < 32) {
      const { data: c } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!c) throw new NotFoundError('Community', slug)
      communityId = c.id
    }

    await supabase
      .from('community_follows_v2')
      .upsert({ identity_id: ctx.identityId, community_id: communityId })

    return ok({ following: true }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    let communityId = slug
    if (!slug.includes('-') || slug.length < 32) {
      const { data: c } = await supabase
        .from('communities')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      if (!c) throw new NotFoundError('Community', slug)
      communityId = c.id
    }

    await supabase
      .from('community_follows_v2')
      .delete()
      .eq('identity_id', ctx.identityId)
      .eq('community_id', communityId)

    return ok({ following: false }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}