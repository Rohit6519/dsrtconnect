// ============================================================
// lib/kernel/authz.ts
// Kernel Authorization Engine.
// Deny-by-default permission checks.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

export interface CheckPermissionParams {
  actorId: string
  action: string
  communityId?: string
  resourceOwnerId?: string
}

export async function checkPermission(
  supabase: SupabaseClient,
  params: CheckPermissionParams
): Promise<{ allow: boolean; reason?: string }> {
  if (!params.actorId) {
    return { allow: false, reason: 'Unauthenticated actor' }
  }

  // 1. Resource ownership check (owner always allowed)
  if (params.resourceOwnerId && params.resourceOwnerId === params.actorId) {
    return { allow: true }
  }

  // 2. Global Super Admin check
  const { data: user } = await supabase
    .from('users')
    .select('is_admin, admin_role')
    .eq('id', params.actorId)
    .maybeSingle()

  if (user?.is_admin || user?.admin_role === 'super_admin' || user?.admin_role === 'admin') {
    return { allow: true }
  }

  // 3. Community-scoped Role Permission Check
  if (params.communityId) {
    const { data: member } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', params.communityId)
      .eq('user_id', params.actorId)
      .maybeSingle()

    if (!member) {
      return { allow: false, reason: 'Not a member of this community' }
    }

    if (member.role === 'owner' || member.role === 'admin') {
      return { allow: true }
    }

    if (member.role === 'moderator' && params.action.startsWith('moderation.')) {
      return { allow: true }
    }

    if (member.role === 'member' && (params.action === 'community.view' || params.action === 'post.create')) {
      return { allow: true }
    }
  }

  return { allow: false, reason: `Action '${params.action}' not granted` }
}