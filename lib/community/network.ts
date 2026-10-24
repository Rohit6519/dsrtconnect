// ============================================================
// lib/community/network.ts
// Server-side query layer for the Community Hub → My Network tab.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

// -----------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------

export async function getNetworkSummary(
  supabase: SupabaseClient,
  identityId: string
) {
  const [
    { count: joinedCount },
    { count: followingCount },
    { count: invitedCount },
    { data: peersRows },
  ] = await Promise.all([
    supabase
      .from('community_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('identity_id', identityId)
      .eq('status', 'ACTIVE'),
    supabase
      .from('community_follows_v2')
      .select('community_id', { count: 'exact', head: true })
      .eq('identity_id', identityId),
    supabase
      .from('community_invitations_v2')
      .select('id', { count: 'exact', head: true })
      .eq('invited_identity_id', identityId)
      .eq('status', 'PENDING'),
    supabase
      .from('community_network_edges')
      .select('peer_id', { count: 'exact', head: true })
      .eq('viewer_id', identityId)
      .limit(1),
  ])

  // Distinct peer count from view
  const { count: peersCount } = await supabase
    .from('community_network_edges')
    .select('peer_id', { count: 'exact', head: true })
    .eq('viewer_id', identityId)

  return {
    joined_count: joinedCount ?? 0,
    following_count: followingCount ?? 0,
    pending_invitation_count: invitedCount ?? 0,
    peers_count: peersCount ?? 0,
  }
}

// -----------------------------------------------------------
// COMMUNITIES bucket (joined | following | invited | past)
// -----------------------------------------------------------

export type CommunityBucket = 'joined' | 'following' | 'invited' | 'past'

export async function getBucketCommunities(
  supabase: SupabaseClient,
  identityId: string,
  bucket: CommunityBucket
) {
  const communityFields = `
    id, public_id, slug, name, short_description, cover_url, banner_url,
    category, community_type, visibility, join_policy, status,
    is_verified, member_count, post_count, topics, location_text
  `

  if (bucket === 'joined') {
    const { data: rows } = await supabase
      .from('community_memberships')
      .select(`
        id, community_id, status, joined_at,
        communities:community_id (${communityFields}),
        community_membership_roles (
          community_roles ( role_key, name )
        )
      `)
      .eq('identity_id', identityId)
      .eq('status', 'ACTIVE')
      .order('joined_at', { ascending: false })

    return (rows || [])
      .filter((r: any) => r.communities)
      .map((r: any) => ({
        membership_id: r.id,
        joined_at: r.joined_at,
        role_keys: (r.community_membership_roles || [])
          .map((mr: any) => mr.community_roles?.role_key)
          .filter(Boolean),
        community: r.communities,
      }))
  }

  if (bucket === 'following') {
    const { data: rows } = await supabase
      .from('community_follows_v2')
      .select(`
        followed_at,
        communities:community_id (${communityFields})
      `)
      .eq('identity_id', identityId)
      .order('followed_at', { ascending: false })

    return (rows || [])
      .filter((r: any) => r.communities)
      .map((r: any) => ({
        followed_at: r.followed_at,
        community: r.communities,
      }))
  }

  if (bucket === 'invited') {
    const { data: rows } = await supabase
      .from('community_invitations_v2')
      .select(`
        id, message, created_at, expires_at, invited_by,
        communities:community_id (${communityFields}),
        role:role_id ( role_key, name ),
        inviter:invited_by ( id, full_name, username, avatar_url )
      `)
      .eq('invited_identity_id', identityId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false })

    return (rows || [])
      .filter((r: any) => r.communities && new Date(r.expires_at) > new Date())
      .map((r: any) => ({
        invitation_id: r.id,
        message: r.message,
        created_at: r.created_at,
        expires_at: r.expires_at,
        role_key: r.role?.role_key ?? null,
        role_name: r.role?.name ?? null,
        inviter: r.inviter,
        community: r.communities,
      }))
  }

  if (bucket === 'past') {
    const { data: rows } = await supabase
      .from('community_memberships')
      .select(`
        id, community_id, status, left_at, joined_at,
        communities:community_id (${communityFields})
      `)
      .eq('identity_id', identityId)
      .in('status', ['LEFT', 'REMOVED', 'REJECTED', 'BANNED'])
      .order('left_at', { ascending: false, nullsFirst: false })

    return (rows || [])
      .filter((r: any) => r.communities)
      .map((r: any) => ({
        membership_id: r.id,
        status: r.status,
        left_at: r.left_at,
        joined_at: r.joined_at,
        community: r.communities,
      }))
  }

  return []
}

// -----------------------------------------------------------
// PEOPLE you've met through communities
// -----------------------------------------------------------

export async function getNetworkPeople(
  supabase: SupabaseClient,
  identityId: string,
  cursor: string | null,
  limit: number
) {
  // Fetch edges (paginated by shared_communities DESC, peer_id for tie-break)
  let query = supabase
    .from('community_network_edges')
    .select('peer_id, shared_communities, shared_community_ids, most_recent_shared_at')
    .eq('viewer_id', identityId)
    .order('shared_communities', { ascending: false })
    .order('most_recent_shared_at', { ascending: false, nullsFirst: false })
    .limit(limit + 1)

  if (cursor) {
    const [sharedStr, peerId] = cursor.split(':')
    const shared = parseInt(sharedStr)
    if (!Number.isNaN(shared) && peerId) {
      query = query.or(
        `shared_communities.lt.${shared},and(shared_communities.eq.${shared},peer_id.gt.${peerId})`
      )
    }
  }

  const { data: edges, error } = await query
  if (error) throw error
  const rows = edges || []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor = hasMore && last ? `${(last as any).shared_communities}:${(last as any).peer_id}` : null

  if (page.length === 0) return { items: [], next_cursor: null, has_more: false }

  const peerIds = page.map((e: any) => e.peer_id)
  const commIds = Array.from(new Set(page.flatMap((e: any) => e.shared_community_ids || [])))

  const [{ data: peers }, { data: communities }] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, full_name, avatar_url, tagline, is_verified')
      .in('id', peerIds),
    commIds.length > 0
      ? supabase
          .from('communities')
          .select('id, slug, name')
          .in('id', commIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const peerMap = new Map((peers || []).map((u: any) => [u.id, u]))
  const commMap = new Map((communities || []).map((c: any) => [c.id, c]))

  const items = page.map((e: any) => ({
    identity_id: e.peer_id,
    shared_communities: e.shared_communities,
    most_recent_shared_at: e.most_recent_shared_at,
    user: peerMap.get(e.peer_id) ?? null,
    shared: (e.shared_community_ids || [])
      .map((cid: string) => commMap.get(cid))
      .filter(Boolean),
  }))

  return { items, next_cursor: nextCursor, has_more: hasMore }
}

// -----------------------------------------------------------
// ACTIVITY feed — from projection table
// -----------------------------------------------------------

export async function getNetworkActivity(
  supabase: SupabaseClient,
  identityId: string,
  cursor: string | null,
  limit: number
) {
  // Communities the viewer is in or follows
  const [{ data: memberships }, { data: follows }] = await Promise.all([
    supabase
      .from('community_memberships')
      .select('community_id')
      .eq('identity_id', identityId)
      .eq('status', 'ACTIVE'),
    supabase
      .from('community_follows_v2')
      .select('community_id')
      .eq('identity_id', identityId),
  ])

  const communityIds = Array.from(
    new Set([
      ...(memberships || []).map((r: any) => r.community_id),
      ...(follows || []).map((r: any) => r.community_id),
    ])
  )

  if (communityIds.length === 0) {
    return { items: [], next_cursor: null, has_more: false }
  }

  let query = supabase
    .from('community_activity_projection')
    .select('*')
    .in('community_id', communityIds)
    .order('occurred_at', { ascending: false })
    .limit(limit + 1)

  if (cursor) query = query.lt('occurred_at', cursor)

  const { data: activities, error } = await query
  if (error) throw error
  const rows = activities || []
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const last = page[page.length - 1]
  const nextCursor = hasMore && last ? (last as any).occurred_at : null

  // Enrich actors + communities
  const actorIds = Array.from(new Set(page.map((a: any) => a.actor_id).filter(Boolean)))
  const commIds = Array.from(new Set(page.map((a: any) => a.community_id).filter(Boolean)))

  const [{ data: actors }, { data: communities }] = await Promise.all([
    actorIds.length > 0
      ? supabase.from('users').select('id, username, full_name, avatar_url').in('id', actorIds)
      : Promise.resolve({ data: [] as any[] }),
    commIds.length > 0
      ? supabase.from('communities').select('id, slug, name, cover_url').in('id', commIds)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const actorMap = new Map((actors || []).map((u: any) => [u.id, u]))
  const commMap = new Map((communities || []).map((c: any) => [c.id, c]))

  const items = page.map((a: any) => ({
    id: a.id,
    verb: a.verb,
    occurred_at: a.occurred_at,
    community: commMap.get(a.community_id) ?? null,
    actor: a.actor_id ? actorMap.get(a.actor_id) : null,
    metadata: a.metadata,
  }))

  return { items, next_cursor: nextCursor, has_more: hasMore }
}

// -----------------------------------------------------------
// INVITATION mutations
// -----------------------------------------------------------

export async function declineInvitation(
  supabase: SupabaseClient,
  identityId: string,
  invitationId: string
) {
  const { data: invitation } = await supabase
    .from('community_invitations_v2')
    .select('id, invited_identity_id, status')
    .eq('id', invitationId)
    .maybeSingle()

  if (!invitation) return { ok: false, reason: 'not_found' }
  if (invitation.invited_identity_id !== identityId) return { ok: false, reason: 'forbidden' }
  if (invitation.status !== 'PENDING') return { ok: false, reason: 'not_pending' }

  await supabase
    .from('community_invitations_v2')
    .update({ status: 'DECLINED' })
    .eq('id', invitationId)

  return { ok: true }
}