import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ForbiddenError, writeAudit } from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from '@/lib/community/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const { data: rules } = await supabase
      .from('community_rules')
      .select('*')
      .eq('community_id', community.id)
      .eq('status', 'ACTIVE')
      .order('position', { ascending: true })

    return ok({ items: rules || [] }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    const { data: community } = await supabase.from('communities').select('id').eq('slug', slug).maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const canManage = await hasCommunityPermission(
      supabase,
      ctx.identityId,
      community.id,
      COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
    )
    if (!canManage) throw new ForbiddenError('Not allowed')

    const rules = Array.isArray(body.rules) ? body.rules : []
    // Replace all rules
    await supabase.from('community_rules').delete().eq('community_id', community.id)
    if (rules.length > 0) {
      const rows = rules
        .filter((r: any) => r.title && r.title.trim())
        .map((r: any, i: number) => ({
          community_id: community.id,
          title: r.title.trim(),
          description: r.description?.trim() || null,
          position: i,
          status: 'ACTIVE',
          created_by: ctx!.identityId,
        }))
      if (rows.length > 0) await supabase.from('community_rules').insert(rows)
    }

    await writeAudit(supabase, {
      actorId: ctx.identityId,
      action: 'community.rules.updated',
      entityType: 'community',
      entityId: community.id,
      requestId: ctx.requestId,
      metadata: { rules_count: rules.length },
    })

    return ok({ saved: true, count: rules.length }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}