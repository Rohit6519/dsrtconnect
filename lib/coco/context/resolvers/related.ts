// ============================================================
// lib/coco/context/resolvers/related.ts
// L4 — Related entities.
// Kept intentionally narrow in v0.1 to control cost/latency.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { EntityContext, RelatedEntitiesContext, UUID } from '@/types/coco'

const RELATED_LIMIT = 5

/**
 * For each entity type, return a small set of directly related entities.
 * The compiler decides whether to include this at all based on the request class.
 */
export async function resolveRelated(
  entity: EntityContext | undefined,
  userId: UUID
): Promise<RelatedEntitiesContext | undefined> {
  if (!entity) return undefined

  switch (entity.type) {
    case 'project':   return relatedForProject(entity.id, userId)
    case 'venture':   return relatedForVenture(entity.id, userId)
    case 'community': return relatedForCommunity(entity.id, userId)
    default: return undefined
  }
}

async function relatedForProject(projectId: string, userId: UUID): Promise<RelatedEntitiesContext | undefined> {
  // Team members on this project
  const { data: members } = await adminClient
    .from('project_members')
    .select('user_id, role, users!inner(id, username, full_name)')
    .eq('project_id', projectId)
    .limit(RELATED_LIMIT)

  const entities = (members || []).map((m: any) => ({
    type: 'user' as const,
    id: m.users?.id,
    slug: m.users?.username || undefined,
    display_name: m.users?.full_name || m.users?.username || undefined,
  })).filter(e => e.id)

  if (entities.length === 0) return undefined

  return {
    entities,
    reasons: { project_team: `${entities.length} project members` },
  }
}

async function relatedForVenture(ventureId: string, userId: UUID): Promise<RelatedEntitiesContext | undefined> {
  const { data: members } = await adminClient
    .from('venture_members')
    .select('user_id, role, users!inner(id, username, full_name)')
    .eq('venture_id', ventureId)
    .limit(RELATED_LIMIT)

  const entities = (members || []).map((m: any) => ({
    type: 'user' as const,
    id: m.users?.id,
    slug: m.users?.username || undefined,
    display_name: m.users?.full_name || m.users?.username || undefined,
  })).filter(e => e.id)

  if (entities.length === 0) return undefined

  return {
    entities,
    reasons: { venture_team: `${entities.length} venture members` },
  }
}

async function relatedForCommunity(communityId: string, userId: UUID): Promise<RelatedEntitiesContext | undefined> {
  // Community leadership/mods only — full member list is not context-relevant
  const { data: leaders } = await adminClient
    .from('community_members')
    .select('user_id, role, users!inner(id, username, full_name)')
    .eq('community_id', communityId)
    .in('role', ['owner', 'admin', 'moderator'])
    .limit(RELATED_LIMIT)

  const entities = (leaders || []).map((m: any) => ({
    type: 'user' as const,
    id: m.users?.id,
    slug: m.users?.username || undefined,
    display_name: m.users?.full_name || m.users?.username || undefined,
  })).filter(e => e.id)

  if (entities.length === 0) return undefined

  return {
    entities,
    reasons: { community_leaders: `${entities.length} community leaders` },
  }
}