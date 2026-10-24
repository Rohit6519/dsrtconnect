import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail, NotFoundError, ForbiddenError } from '@/lib/kernel'
import { hasCommunityPermission, COMMUNITY_PERMISSIONS } from '@/lib/community/permissions'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    const canView = await hasCommunityPermission(
      supabase,
      ctx.identityId,
      community.id,
      COMMUNITY_PERMISSIONS.INVITATION_CREATE
    )
    if (!canView) throw new ForbiddenError('Not allowed')

    const { data: rows } = await supabase
      .from('community_invitations_v2')
      .select(`
        id, status, invited_email, invited_identity_id, invited_by,
        message, expires_at, created_at, accepted_at, revoked_at,
        role:role_id ( role_key, name )
      `)
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(100)

    // Enrich invitee + inviter
    const idIds = Array.from(
      new Set(
        (rows || []).flatMap((r: any) =>
          [r.invited_identity_id, r.invited_by].filter(Boolean)
        )
      )
    )
    const { data: users } =
      idIds.length > 0
        ? await supabase
            .from('users')
            .select('id, username, full_name, avatar_url')
            .in('id', idIds)
        : { data: [] as any[] }
    const map = new Map((users || []).map((u: any) => [u.id, u]))

    const items = (rows || []).map((r: any) => ({
      ...r,
      invitee: r.invited_identity_id ? map.get(r.invited_identity_id) : null,
      inviter: r.invited_by ? map.get(r.invited_by) : null,
    }))

    return ok({ items }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}