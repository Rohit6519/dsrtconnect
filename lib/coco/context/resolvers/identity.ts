// ============================================================
// lib/coco/context/resolvers/identity.ts
// L0 — Identity resolution.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { IdentityContext, UUID } from '@/types/coco'

export async function resolveIdentity(userId: UUID): Promise<IdentityContext> {
  const { data } = await adminClient
    .from('users')
    .select('id, username, full_name, is_verified, is_admin, onboarding_complete')
    .eq('id', userId)
    .maybeSingle()

  return {
    user_id: userId,
    username: data?.username || undefined,
    full_name: data?.full_name || undefined,
    role: data?.is_admin ? 'admin' : 'user',
    is_verified: !!data?.is_verified,
    onboarding_complete: !!data?.onboarding_complete,
  }
}