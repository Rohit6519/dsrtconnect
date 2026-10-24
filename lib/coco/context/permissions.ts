// ============================================================
// lib/coco/context/permissions.ts
// Resolve the user's real permission set from the database.
// This is the ONLY source of truth for what COCO is allowed to do.
// ============================================================

import { adminClient } from '@/lib/supabase/admin'
import type { CocoPermissionScope, UserPermissionSet } from '@/types/coco'

/**
 * Resolve the user's session permission set.
 * For v0.1 we grant a baseline scope set to every authenticated user
 * and let the executor enforce entity-level checks at call time via RLS.
 */
export async function resolveUserPermissions(userId: string): Promise<UserPermissionSet> {
  const { data: profile } = await adminClient
    .from('users')
    .select('id, is_admin, onboarding_complete')
    .eq('id', userId)
    .maybeSingle()

  const isAdmin = !!profile?.is_admin

  // Baseline scopes every authenticated user gets
  const scopes: CocoPermissionScope[] = [
    'read:self',
    'read:projects',
    'read:ventures',
    'read:communities',
    'read:mail',
    'read:network',
    'read:posts',
    'ui:navigate',
    'ui:manipulate',
    'write:project',
    'write:venture',
    'write:post_draft',
    'write:mail_draft',
  ]

  // R3 scopes require the user to have completed onboarding
  if (profile?.onboarding_complete) {
    scopes.push('send:mail', 'send:connection_request', 'send:invitation', 'publish:post')
  }

  // R4 admin-only
  if (isAdmin) {
    scopes.push('delete:project', 'delete:venture', 'security:manage')
  }

  return {
    user_id: userId,
    scopes,
    // v0.1 defaults; will be user-configurable in the settings panel
    auto_confirm_r2: true,
    proactive_enabled: false,
  }
}