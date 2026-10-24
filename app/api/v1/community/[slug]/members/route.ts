import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildRequestContext, ok, fail, NotFoundError, ForbiddenError } from '@/lib/kernel'
import { resolveCommunityCapabilities } from '@/lib/community'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  let ctx
  try {
    const { slug } = await params
    ctx = await buildRequestContext(req)
    const supabase = await createClient()

    const { data: community } = await supabase
      .from('communities')
      .select('id, visibility, status')
      .eq('slug', slug)
      .maybeSingle()
    if (!community) throw new NotFoundError('Community', slug)

    // Directory visibility check
    const { data: settings } = await supabase
      .from('community_settings')
      .select('show_member_directory')
      .eq('community_id', community.id)
      .maybeSingle()

    const caps = await resolveCommunityCapabilities(supabase, community.id, ctx.identityId)
    if (settings?.show_member_directory === false && !caps.is_member && !caps.is_admin) {
      throw new ForbiddenError('The member directory is hidden for this community')
    }

    const sp = req.nextUrl.searchParams
    const limit = Math.min(parseInt(sp.get('limit') || '24'), 60)
    const cursor = sp.get('cursor')
    const roleFilter = sp.get('role') // OWNER | ADMIN | MODERATOR | MEMBER
    const q = (sp.get('q') || '').trim().toLowerCase()

    // Fetch memberships (cursor-paginated by joined_at DESC)
    let mQuery = supabase
      .from('community_memberships')
      .select('id, identity_id, joined_at, status')
      .eq('community_id', community.id)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: false })
      .limit(limit + 1)

    if (cursor) mQuery = mQuery.lt('joined_at', cursor)

    const { data: memberships, error } = await mQuery
    if (error) throw error
    const memRows = (memberships || []) as any[]

    // Fetch roles for those memberships in one shot
    const membershipIds = memRows.map((m) => m.id)
    const identityIds = memRows.map((m) => m.identity_id)

    const [{ data: roleRows }, { data: users }] = await Promise.all([
      membershipIds.length > 0
        ? supabase
            .from('community_membership_roles')
            .select('membership_id, community_roles!inner ( role_key, name )')
            .in('membership_id', membershipIds)
        : Promise.resolve({ data: [] as any[] }),
      identityIds.length > 0
        ? supabase
            .from('users')
            .select('id, username, full_name, avatar_url, tagline, is_verified')
            .in('id', identityIds)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const roleMap = new Map<string, string[]>()
    for (const rr of (roleRows || []) as any[]) {
      const k = rr.membership_id as string
      const key = rr.community_roles?.role_key
      if (!key) continue
      const arr = roleMap.get(k) || []
      arr.push(key)
      roleMap.set(k, arr)
    }

    const userMap = new Map((users || []).map((u: any) => [u.id, u]))

    let enriched = memRows.map((m) => {
      const roles = roleMap.get(m.id) || ['MEMBER']
      const topRole = roles.includes('OWNER')
        ? 'OWNER'
        : roles.includes('ADMIN')
        ? 'ADMIN'
        : roles.includes('MODERATOR')
        ? 'MODERATOR'
        : 'MEMBER'
      return {
        membership_id: m.id,
        joined_at: m.joined_at,
        role_keys: roles,
        top_role: topRole,
        user: userMap.get(m.identity_id) ?? null,
      }
    })

    if (roleFilter) enriched = enriched.filter((e) => e.role_keys.includes(roleFilter))
    if (q) {
      enriched = enriched.filter((e) =>
        e.user &&
        ((e.user.full_name || '').toLowerCase().includes(q) ||
          (e.user.username || '').toLowerCase().includes(q))
      )
    }

    const hasMore = memRows.length > limit
    const items = hasMore ? enriched.slice(0, limit) : enriched
    const last = memRows[Math.min(limit - 1, memRows.length - 1)]
    const nextCursor = hasMore && last ? last.joined_at : null

    return ok({ items, next_cursor: nextCursor, has_more: hasMore }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}