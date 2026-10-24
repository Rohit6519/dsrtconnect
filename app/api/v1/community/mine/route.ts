import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthContext, ok, fail } from '@/lib/kernel'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  let ctx
  try {
    ctx = await requireAuthContext(req)
    const supabase = await createClient()

    // Prefer full fields; fall back if some columns are missing
    let memberships: any[] | null = null
    let memError: any = null

    const fullSelect = `
      id,
      community_id,
      status,
      joined_at,
      communities:community_id (
        id, public_id, slug, name, short_description,
        logo_url, cover_url, banner_url,
        category, community_type, visibility, join_policy, status,
        is_verified, member_count, post_count, topics, location_text,
        created_at, published_at, updated_at
      ),
      community_membership_roles (
        community_roles ( role_key, name )
      )
    `

    const safeSelect = `
      id,
      community_id,
      status,
      joined_at,
      communities:community_id (
        id, public_id, slug, name, short_description,
        cover_url, banner_url,
        category, visibility, join_policy, status,
        is_verified, member_count, post_count, topics, location_text,
        created_at, updated_at
      ),
      community_membership_roles (
        community_roles ( role_key, name )
      )
    `

    const first = await supabase
      .from('community_memberships')
      .select(fullSelect)
      .eq('identity_id', ctx.identityId)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: false })

    if (first.error) {
      memError = first.error
      const second = await supabase
        .from('community_memberships')
        .select(safeSelect)
        .eq('identity_id', ctx.identityId)
        .eq('status', 'ACTIVE')
        .order('joined_at', { ascending: false })

      memberships = second.data
      memError = second.error
    } else {
      memberships = first.data
    }

    // Last fallback: bare memberships + separate communities fetch
    if (memError || !memberships) {
      const { data: bare } = await supabase
        .from('community_memberships')
        .select('id, community_id, status, joined_at')
        .eq('identity_id', ctx.identityId)
        .eq('status', 'ACTIVE')
        .order('joined_at', { ascending: false })

      const ids = (bare || []).map((m: any) => m.community_id).filter(Boolean)
      let communitiesMap = new Map<string, any>()

      if (ids.length > 0) {
        const { data: comms } = await supabase
          .from('communities')
          .select('*')
          .in('id', ids)

        for (const c of comms || []) {
          communitiesMap.set(c.id, c)
        }
      }

      const items = (bare || [])
        .map((m: any) => {
          const community = communitiesMap.get(m.community_id)
          if (!community) return null
          return {
            membership_id: m.id,
            joined_at: m.joined_at,
            role_keys: ['MEMBER'],
            top_role: community.owner_identity_id === ctx.identityId ? 'OWNER' : 'MEMBER',
            community: {
              ...community,
              logo_url: community.logo_url || null,
              cover_url: community.cover_url || community.banner_url || null,
              banner_url: community.banner_url || community.cover_url || null,
            },
          }
        })
        .filter(Boolean)

      const { data: drafts } = await supabase
        .from('community_drafts')
        .select('*')
        .eq('owner_identity_id', ctx.identityId)
        .eq('status', 'DRAFT')
        .order('updated_at', { ascending: false })
        .limit(6)

      return ok({ items, drafts: drafts || [] }, { ctx })
    }

    const items = (memberships || [])
      .filter((m: any) => m.communities)
      .map((m: any) => {
        const roleKeys: string[] = (m.community_membership_roles || [])
          .map((r: any) => r.community_roles?.role_key)
          .filter(Boolean)

        const topRole = roleKeys.includes('OWNER')
          ? 'OWNER'
          : roleKeys.includes('ADMIN')
          ? 'ADMIN'
          : roleKeys.includes('MODERATOR')
          ? 'MODERATOR'
          : 'MEMBER'

        const c = m.communities
        return {
          membership_id: m.id,
          joined_at: m.joined_at,
          role_keys: roleKeys,
          top_role: topRole,
          community: {
            ...c,
            logo_url: c.logo_url || null,
            cover_url: c.cover_url || c.banner_url || null,
            banner_url: c.banner_url || c.cover_url || null,
          },
        }
      })

    const { data: drafts } = await supabase
      .from('community_drafts')
      .select('*')
      .eq('owner_identity_id', ctx.identityId)
      .eq('status', 'DRAFT')
      .order('updated_at', { ascending: false })
      .limit(6)

    return ok({ items, drafts: drafts || [] }, { ctx })
  } catch (err) {
    return fail(err, ctx)
  }
}