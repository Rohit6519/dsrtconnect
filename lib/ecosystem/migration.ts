import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verify migration health — checks that new tables have expected data counts
 * relative to old tables.
 */
export async function verifyMigrationHealth(supabase: SupabaseClient) {
  const checks: Array<{ name: string; status: 'ok' | 'warning' | 'error'; detail: string }> = []

  // 1. Communities: new kernel columns backfilled
  const { count: totalCommunities } = await supabase.from('communities').select('id', { count: 'exact', head: true })
  const { count: withPublicId } = await supabase.from('communities').select('id', { count: 'exact', head: true }).not('public_id', 'is', null)
  const { count: withOwner } = await supabase.from('communities').select('id', { count: 'exact', head: true }).not('owner_identity_id', 'is', null)
  checks.push({
    name: 'communities.public_id',
    status: withPublicId === totalCommunities ? 'ok' : 'warning',
    detail: `${withPublicId}/${totalCommunities} have public_id`,
  })
  checks.push({
    name: 'communities.owner_identity_id',
    status: withOwner === totalCommunities ? 'ok' : 'warning',
    detail: `${withOwner}/${totalCommunities} have owner_identity_id`,
  })

  // 2. Memberships migrated
  const { count: legacyMembers } = await supabase.from('community_members').select('id', { count: 'exact', head: true })
  const { count: newMemberships } = await supabase.from('community_memberships').select('id', { count: 'exact', head: true })
  checks.push({
    name: 'memberships',
    status: (newMemberships || 0) >= (legacyMembers || 0) ? 'ok' : 'warning',
    detail: `legacy: ${legacyMembers}, new: ${newMemberships}`,
  })

  // 3. Roles seeded
  const { count: roleCount } = await supabase.from('community_roles').select('id', { count: 'exact', head: true })
  checks.push({
    name: 'roles',
    status: (roleCount || 0) >= (totalCommunities || 0) * 4 ? 'ok' : 'warning',
    detail: `${roleCount} roles for ${totalCommunities} communities`,
  })

  // 4. Settings seeded
  const { count: settingsCount } = await supabase.from('community_settings').select('community_id', { count: 'exact', head: true })
  checks.push({
    name: 'settings',
    status: settingsCount === totalCommunities ? 'ok' : 'warning',
    detail: `${settingsCount}/${totalCommunities} have settings`,
  })

  // 5. Notifications dual-column
  const { count: notifTotal } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
  const { count: notifWithRecipient } = await supabase.from('notifications').select('id', { count: 'exact', head: true }).not('recipient_id', 'is', null)
  checks.push({
    name: 'notifications.recipient_id',
    status: notifWithRecipient === notifTotal ? 'ok' : 'warning',
    detail: `${notifWithRecipient}/${notifTotal} have recipient_id`,
  })

  // 6. Kernel tables exist
  const kernelTables = [
    'kernel_outbox_events', 'kernel_audit_logs', 'kernel_event_consumptions',
    'kernel_jobs', 'kernel_feature_flags', 'kernel_idempotency_keys',
  ]
  for (const t of kernelTables) {
    const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).limit(0)
    checks.push({
      name: `table.${t}`,
      status: count !== null ? 'ok' : 'error',
      detail: count !== null ? `exists (${count} rows)` : 'missing',
    })
  }

  // 7. Feature flag
  const { data: flag } = await supabase.from('kernel_feature_flags').select('*').eq('key', 'community_hub_v2').maybeSingle()
  checks.push({
    name: 'feature_flag.community_hub_v2',
    status: flag ? 'ok' : 'warning',
    detail: flag ? `enabled=${flag.enabled}, rollout=${flag.rollout_percent}%` : 'missing',
  })

  const hasErrors = checks.some((c) => c.status === 'error')
  const hasWarnings = checks.some((c) => c.status === 'warning')

  return {
    overall: hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy',
    checks,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Enable feature flag for a percentage of users.
 */
export async function setRolloutPercent(
  supabase: SupabaseClient,
  percent: number
) {
  if (percent < 0 || percent > 100) throw new Error('Percent must be 0–100')
  await supabase
    .from('kernel_feature_flags')
    .update({
      enabled: percent > 0,
      rollout_percent: percent,
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'community_hub_v2')
  return { percent }
}