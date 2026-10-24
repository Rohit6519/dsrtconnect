// ============================================================
// lib/community/service.moderation.ts
// Moderation workflow — reports, cases, actions, appeals.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  createNotification,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  StateConflictError,
} from '@/lib/kernel'
import {
  hasCommunityPermission,
  COMMUNITY_PERMISSIONS,
} from './permissions'
import { memberAction } from './service.studio'

export const REPORT_REASONS = [
  'SPAM',
  'HARASSMENT',
  'ABUSE',
  'HATE',
  'MISINFORMATION',
  'SCAM',
  'ILLEGAL_CONTENT',
  'OFF_TOPIC',
  'IMPERSONATION',
  'OTHER',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const MOD_ACTION_TYPES = [
  'WARN',
  'CONTENT_HIDE',
  'CONTENT_REMOVE',
  'CONTENT_RESTORE',
  'RESTRICT_POSTING',
  'RESTRICT_INVITES',
  'RESTRICT_MEDIA',
  'MEMBER_SUSPEND',
  'MEMBER_BAN',
  'MEMBER_UNBAN',
  'MEMBER_REMOVE',
  'CASE_DISMISS',
] as const

export type ModActionType = (typeof MOD_ACTION_TYPES)[number]

// -----------------------------------------------------------
// SUBMIT REPORT
// -----------------------------------------------------------

export async function submitReport(
  supabase: SupabaseClient,
  reporterId: string,
  input: {
    community_id: string
    target_type: 'post' | 'comment' | 'announcement' | 'member' | 'resource'
    target_id: string
    reason: ReportReason
    description?: string
  },
  requestId?: string
): Promise<{ report_id: string; case_id: string; event_id: string }> {
  const { data: membership } = await supabase
    .from('community_memberships')
    .select('id, status')
    .eq('community_id', input.community_id)
    .eq('identity_id', reporterId)
    .maybeSingle()
  if (!membership || membership.status !== 'ACTIVE') {
    throw new ForbiddenError('Only active members can report')
  }

  if (!REPORT_REASONS.includes(input.reason)) {
    throw new ValidationError([{ field: 'reason', message: 'Invalid reason' }])
  }

  // Resolve target author
  let targetAuthorId: string | null = null
  if (input.target_type === 'post') {
    const { data: p } = await supabase
      .from('community_posts_v2')
      .select('author_identity_id')
      .eq('id', input.target_id)
      .maybeSingle()
    targetAuthorId = p?.author_identity_id ?? null
  } else if (input.target_type === 'comment') {
    const { data: c } = await supabase
      .from('community_comments')
      .select('author_identity_id')
      .eq('id', input.target_id)
      .maybeSingle()
    targetAuthorId = c?.author_identity_id ?? null
  } else if (input.target_type === 'announcement') {
    const { data: a } = await supabase
      .from('community_announcements')
      .select('author_identity_id')
      .eq('id', input.target_id)
      .maybeSingle()
    targetAuthorId = a?.author_identity_id ?? null
  } else if (input.target_type === 'member') {
    targetAuthorId = input.target_id
  }

  if (targetAuthorId === reporterId) {
    throw new ValidationError([
      { field: 'target', message: 'You cannot report your own content' },
    ])
  }

  const { data: scoreData } = await supabase.rpc('rpc_compute_report_priority', {
    p_reason: input.reason,
    p_target_type: input.target_type,
    p_target_id: input.target_id,
    p_community_id: input.community_id,
  })
  const priorityScore = (scoreData as number) || 0
  const priority =
    priorityScore >= 80
      ? 'URGENT'
      : priorityScore >= 55
      ? 'HIGH'
      : priorityScore >= 30
      ? 'NORMAL'
      : 'LOW'

  const { data: report, error } = await supabase
    .from('community_reports')
    .insert({
      community_id: input.community_id,
      reporter_identity_id: reporterId,
      target_type: input.target_type,
      target_id: input.target_id,
      target_author_identity_id: targetAuthorId,
      reason: input.reason,
      description: input.description?.trim() || null,
      priority,
      priority_score: priorityScore,
      status: 'OPEN',
    })
    .select('*')
    .single()

  if (error) {
    if ((error as any).code === '23505') {
      throw new StateConflictError('You already reported this')
    }
    throw error
  }

  // Case grouping
  let caseId: string
  const { data: existingCase } = await supabase
    .from('community_moderation_cases')
    .select('id, report_count, priority_score')
    .eq('community_id', input.community_id)
    .eq('target_type', input.target_type)
    .eq('target_id', input.target_id)
    .in('status', ['OPEN', 'UNDER_REVIEW'])
    .maybeSingle()

  if (existingCase) {
    caseId = existingCase.id
    const newScore = Math.max(existingCase.priority_score, priorityScore)
    await supabase
      .from('community_moderation_cases')
      .update({
        report_count: existingCase.report_count + 1,
        priority_score: newScore,
        priority:
          newScore >= 80
            ? 'URGENT'
            : newScore >= 55
            ? 'HIGH'
            : newScore >= 30
            ? 'NORMAL'
            : 'LOW',
      })
      .eq('id', existingCase.id)
  } else {
    const { data: newCase, error: caseErr } = await supabase
      .from('community_moderation_cases')
      .insert({
        community_id: input.community_id,
        target_type: input.target_type,
        target_id: input.target_id,
        target_author_identity_id: targetAuthorId,
        status: 'OPEN',
        priority,
        priority_score: priorityScore,
        report_count: 1,
      })
      .select('id')
      .single()
    if (caseErr || !newCase) throw new Error(`Case creation failed: ${caseErr?.message}`)
    caseId = newCase.id
  }

  await supabase.from('community_reports').update({ case_id: caseId }).eq('id', report.id)
  await captureEvidence(supabase, caseId, reporterId, input.target_type, input.target_id)

  await writeAudit(supabase, {
    actorId: reporterId,
    action: 'community.report.submitted',
    entityType: 'community_report',
    entityId: report.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
    metadata: { reason: input.reason, target_type: input.target_type, priority },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.REPORT_SUBMITTED,
    aggregateType: 'community_report',
    aggregateId: report.id,
    actorId: reporterId,
    payload: {
      community_id: input.community_id,
      case_id: caseId,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      priority,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { report_id: report.id, case_id: caseId, event_id: eventId }
}

// -----------------------------------------------------------
// Helper: evidence capture
// -----------------------------------------------------------

async function captureEvidence(
  supabase: SupabaseClient,
  caseId: string,
  addedBy: string,
  targetType: string,
  targetId: string
) {
  let snapshot: string | null = null
  const evidenceType = 'REPORT_SNAPSHOT'

  try {
    if (targetType === 'post') {
      const { data } = await supabase
        .from('community_posts_v2')
        .select('title, body, link_url')
        .eq('id', targetId)
        .maybeSingle()
      if (data) {
        snapshot = [data.title, data.body, data.link_url].filter(Boolean).join('\n\n---\n\n')
      }
    } else if (targetType === 'comment') {
      const { data } = await supabase
        .from('community_comments')
        .select('body')
        .eq('id', targetId)
        .maybeSingle()
      snapshot = data?.body || null
    } else if (targetType === 'announcement') {
      const { data } = await supabase
        .from('community_announcements')
        .select('title, body')
        .eq('id', targetId)
        .maybeSingle()
      if (data) snapshot = `${data.title}\n\n${data.body}`
    }
  } catch (e: any) {
    console.warn('[moderation:evidence_capture_failed]', e?.message)
  }

  if (snapshot) {
    await supabase.from('community_moderation_evidence').insert({
      case_id: caseId,
      added_by: addedBy,
      evidence_type: evidenceType,
      content_snapshot: snapshot.slice(0, 8000),
    })
  }
}

// -----------------------------------------------------------
// LIST / DETAIL
// -----------------------------------------------------------

export async function listCases(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  opts: {
    status?: string | null
    priority?: string | null
    cursor?: string | null
    limit: number
  }
) {
  const canReview = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.MODERATION_REVIEW
  )
  if (!canReview) throw new ForbiddenError('Not allowed')

  const statusFilter = opts.status || 'OPEN,UNDER_REVIEW'
  const statuses = statusFilter.split(',')

  let query = supabase
    .from('community_moderation_cases')
    .select('*')
    .eq('community_id', communityId)
    .in('status', statuses)
    .order('priority_score', { ascending: false })
    .order('opened_at', { ascending: false })
    .limit(opts.limit + 1)

  if (opts.priority) query = query.eq('priority', opts.priority)

  // Cursor decoded from base64url to survive ISO timestamps with colons
  if (opts.cursor) {
    try {
      const decoded = Buffer.from(opts.cursor, 'base64url').toString('utf8')
      const [scoreStr, ts] = decoded.split('|')
      const score = parseInt(scoreStr, 10)
      if (!Number.isNaN(score) && ts) {
        query = query.or(
          `priority_score.lt.${score},and(priority_score.eq.${score},opened_at.lt.${ts})`
        )
      }
    } catch { /* ignore malformed cursor */ }
  }

  const { data: rows, error } = await query
  if (error) throw error
  const cases = (rows || []) as any[]

  const authorIds = Array.from(
    new Set(
      cases
        .flatMap((c) => [c.target_author_identity_id, c.assigned_to])
        .filter(Boolean)
    )
  )
  const { data: users } =
    authorIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .in('id', authorIds)
      : { data: [] as any[] }
  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  const hasMore = cases.length > opts.limit
  const items = hasMore ? cases.slice(0, opts.limit) : cases
  const last = items[items.length - 1]
  const nextCursor =
    hasMore && last
      ? Buffer.from(`${last.priority_score}|${last.opened_at}`).toString('base64url')
      : null

  return {
    items: items.map((c: any) => ({
      ...c,
      target_author: c.target_author_identity_id
        ? userMap.get(c.target_author_identity_id)
        : null,
      assigned_user: c.assigned_to ? userMap.get(c.assigned_to) : null,
    })),
    next_cursor: nextCursor,
    has_more: hasMore,
  }
}

export async function getCaseDetail(
  supabase: SupabaseClient,
  actorId: string,
  caseId: string
) {
  const { data: c } = await supabase
    .from('community_moderation_cases')
    .select('*, communities(slug, name)')
    .eq('id', caseId)
    .maybeSingle()
  if (!c) throw new NotFoundError('Case', caseId)

  const canReview = await hasCommunityPermission(
    supabase,
    actorId,
    c.community_id,
    COMMUNITY_PERMISSIONS.MODERATION_REVIEW
  )
  if (!canReview) throw new ForbiddenError('Not allowed')

  const [reportsRes, actionsRes, evidenceRes] = await Promise.all([
    supabase
      .from('community_reports')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('community_moderation_actions')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('community_moderation_evidence')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true }),
  ])

  const userIds = Array.from(
    new Set(
      [
        ...(reportsRes.data || []).map((r: any) => r.reporter_identity_id),
        ...(actionsRes.data || []).map((a: any) => a.actor_id),
        ...(evidenceRes.data || []).map((e: any) => e.added_by),
        c.target_author_identity_id,
        c.assigned_to,
      ].filter(Boolean)
    )
  )
  const { data: users } =
    userIds.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, avatar_url, is_verified')
          .in('id', userIds)
      : { data: [] as any[] }
  const userMap = new Map((users || []).map((u: any) => [u.id, u]))

  return {
    case: {
      ...c,
      target_author: c.target_author_identity_id
        ? userMap.get(c.target_author_identity_id)
        : null,
      assigned_user: c.assigned_to ? userMap.get(c.assigned_to) : null,
    },
    reports: (reportsRes.data || []).map((r: any) => ({
      ...r,
      reporter: userMap.get(r.reporter_identity_id) || null,
    })),
    actions: (actionsRes.data || []).map((a: any) => ({
      ...a,
      actor: userMap.get(a.actor_id) || null,
    })),
    evidence: (evidenceRes.data || []).map((e: any) => ({
      ...e,
      added_by_user: userMap.get(e.added_by) || null,
    })),
  }
}

// -----------------------------------------------------------
// TAKE ACTION
// -----------------------------------------------------------

export async function takeModerationAction(
  supabase: SupabaseClient,
  actorId: string,
  caseId: string,
  input: {
    action_type: ModActionType
    reason?: string
    policy_code?: string
    duration_hours?: number
    resolve_case?: boolean
    resolution?: string
  },
  requestId?: string
): Promise<{ action_id: string; event_id: string; applied: boolean; apply_error?: string }> {
  const { data: c } = await supabase
    .from('community_moderation_cases')
    .select('*, communities(slug, name)')
    .eq('id', caseId)
    .maybeSingle()
  if (!c) throw new NotFoundError('Case', caseId)

  const canAct = await hasCommunityPermission(
    supabase,
    actorId,
    c.community_id,
    COMMUNITY_PERMISSIONS.MODERATION_REMOVE
  )
  if (!canAct) throw new ForbiddenError('Not allowed')

  if (!MOD_ACTION_TYPES.includes(input.action_type)) {
    throw new ValidationError([{ field: 'action_type', message: 'Invalid action' }])
  }

  const now = new Date()
  const expiresAt = input.duration_hours
    ? new Date(now.getTime() + input.duration_hours * 3600 * 1000)
    : null

  // Insert action record first
  const { data: action, error: actionErr } = await supabase
    .from('community_moderation_actions')
    .insert({
      case_id: caseId,
      community_id: c.community_id,
      actor_id: actorId,
      action_type: input.action_type,
      target_type: c.target_type,
      target_id: c.target_id,
      target_author_identity_id: c.target_author_identity_id,
      reason: input.reason || null,
      policy_code: input.policy_code || null,
      duration_hours: input.duration_hours || null,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    })
    .select('*')
    .single()

  if (actionErr || !action) throw new Error(`Action failed: ${actionErr?.message}`)

  // Apply the action — capture success/failure explicitly
  let applied = true
  let applyError: string | undefined
  try {
    await applyModerationAction(supabase, actorId, c, action)
  } catch (err: any) {
    applied = false
    applyError = String(err?.message || err || 'unknown apply error')
    console.error('[moderation:apply_failed]', applyError)

    // Mark the action record with the failure so it's visible in the audit trail
    await supabase
      .from('community_moderation_actions')
      .update({
        metadata: { apply_error: applyError, apply_error_at: new Date().toISOString() },
      })
      .eq('id', action.id)
  }

  // Case status: only resolve if apply succeeded AND caller asked to resolve
  if (applied && input.resolve_case) {
    await supabase
      .from('community_moderation_cases')
      .update({
        status: 'RESOLVED',
        resolved_at: now.toISOString(),
        resolved_by: actorId,
        resolution: input.resolution || input.action_type,
        resolution_note: input.reason || null,
      })
      .eq('id', caseId)
  } else if (c.status === 'OPEN') {
    await supabase
      .from('community_moderation_cases')
      .update({ status: 'UNDER_REVIEW' })
      .eq('id', caseId)
  }

  await writeAudit(supabase, {
    actorId,
    action: `community.moderation.${input.action_type.toLowerCase()}`,
    entityType: 'community_moderation_case',
    entityId: caseId,
    scopeType: 'community',
    scopeId: c.community_id,
    requestId,
    metadata: {
      action_type: input.action_type,
      target_type: c.target_type,
      target_id: c.target_id,
      applied,
      apply_error: applyError,
    },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.MODERATION_ACTION_TAKEN,
    aggregateType: 'community_moderation_case',
    aggregateId: caseId,
    actorId,
    payload: {
      community_id: c.community_id,
      case_id: caseId,
      action_type: input.action_type,
      target_type: c.target_type,
      target_id: c.target_id,
      applied,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  // Notify affected member — only if applied AND target is not the actor
  if (applied && c.target_author_identity_id && c.target_author_identity_id !== actorId) {
    const community = (c as any).communities
    const messages: Record<string, string> = {
      WARN: `You received a warning in ${community?.name}`,
      CONTENT_HIDE: 'Your content was hidden by moderators',
      CONTENT_REMOVE: 'Your content was removed by moderators',
      RESTRICT_POSTING: 'You have been restricted from posting',
      RESTRICT_INVITES: 'You have been restricted from inviting',
      MEMBER_SUSPEND: `You have been suspended from ${community?.name}`,
      MEMBER_BAN: `You have been banned from ${community?.name}`,
    }
    // Deliberately skipping MEMBER_REMOVE — user is gone, no need to notify.
    const msg = messages[input.action_type]
    if (msg) {
      await createNotification(supabase, {
        recipientId: c.target_author_identity_id,
        type: 'community_moderation_action',
        priority: 'HIGH',
        entityType: 'community_moderation_action',
        entityId: action.id,
        title: msg,
        body: input.reason || 'Contact community admins for more details.',
        actionUrl: community?.slug ? `/community/${community.slug}` : '/',
        fromUserId: actorId,
        icon: 'alert',
      })
    }
  }

  return { action_id: action.id, event_id: eventId, applied, apply_error: applyError }
}

async function applyModerationAction(
  supabase: SupabaseClient,
  actorId: string,
  caseRow: any,
  action: any
) {
  const { action_type } = action

  if (action_type === 'CONTENT_HIDE' || action_type === 'CONTENT_REMOVE') {
    if (caseRow.target_type === 'post') {
      await supabase
        .from('community_posts_v2')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: actorId,
          status: 'REMOVED',
        })
        .eq('id', caseRow.target_id)
    } else if (caseRow.target_type === 'comment') {
      await supabase
        .from('community_comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', caseRow.target_id)
    } else if (caseRow.target_type === 'announcement') {
      await supabase
        .from('community_announcements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', caseRow.target_id)
    }
  } else if (action_type === 'CONTENT_RESTORE') {
    if (caseRow.target_type === 'post') {
      await supabase
        .from('community_posts_v2')
        .update({ deleted_at: null, deleted_by: null, status: 'PUBLISHED' })
        .eq('id', caseRow.target_id)
    } else if (caseRow.target_type === 'comment') {
      await supabase
        .from('community_comments')
        .update({ deleted_at: null })
        .eq('id', caseRow.target_id)
    } else if (caseRow.target_type === 'announcement') {
      await supabase
        .from('community_announcements')
        .update({ deleted_at: null })
        .eq('id', caseRow.target_id)
    }
  } else if (
    action_type === 'RESTRICT_POSTING' ||
    action_type === 'RESTRICT_INVITES' ||
    action_type === 'RESTRICT_MEDIA'
  ) {
    if (!caseRow.target_author_identity_id) return
    const { data: membership } = await supabase
      .from('community_memberships')
      .select('id')
      .eq('community_id', caseRow.community_id)
      .eq('identity_id', caseRow.target_author_identity_id)
      .maybeSingle()
    if (!membership) return

    await supabase.from('community_member_restrictions').insert({
      membership_id: membership.id,
      restriction_type: action_type,
      reason: action.reason || null,
      starts_at: new Date().toISOString(),
      ends_at: action.expires_at || null,
      created_by: actorId,
    })
  } else if (
    action_type === 'MEMBER_SUSPEND' ||
    action_type === 'MEMBER_BAN' ||
    action_type === 'MEMBER_REMOVE' ||
    action_type === 'MEMBER_UNBAN'
  ) {
    if (!caseRow.target_author_identity_id) return
    const { data: membership } = await supabase
      .from('community_memberships')
      .select('id')
      .eq('community_id', caseRow.community_id)
      .eq('identity_id', caseRow.target_author_identity_id)
      .maybeSingle()
    if (!membership) return

    const mapAction: Record<string, 'suspend' | 'ban' | 'remove' | 'unban'> = {
      MEMBER_SUSPEND: 'suspend',
      MEMBER_BAN: 'ban',
      MEMBER_REMOVE: 'remove',
      MEMBER_UNBAN: 'unban',
    }
    await memberAction(supabase, actorId, membership.id, mapAction[action_type], action.reason)
  }
  // WARN and CASE_DISMISS have no side effects beyond the record.
}

// -----------------------------------------------------------
// ASSIGN / DISMISS
// -----------------------------------------------------------

export async function assignCase(
  supabase: SupabaseClient,
  actorId: string,
  caseId: string,
  requestId?: string
) {
  const { data: c } = await supabase
    .from('community_moderation_cases')
    .select('id, community_id, status')
    .eq('id', caseId)
    .maybeSingle()
  if (!c) throw new NotFoundError('Case', caseId)

  const canReview = await hasCommunityPermission(
    supabase,
    actorId,
    c.community_id,
    COMMUNITY_PERMISSIONS.MODERATION_REVIEW
  )
  if (!canReview) throw new ForbiddenError('Not allowed')

  await supabase
    .from('community_moderation_cases')
    .update({
      assigned_to: actorId,
      assigned_at: new Date().toISOString(),
      status: c.status === 'OPEN' ? 'UNDER_REVIEW' : c.status,
    })
    .eq('id', caseId)

  await writeAudit(supabase, {
    actorId,
    action: 'community.moderation.case_assigned',
    entityType: 'community_moderation_case',
    entityId: caseId,
    scopeType: 'community',
    scopeId: c.community_id,
    requestId,
  })
}

export async function dismissCase(
  supabase: SupabaseClient,
  actorId: string,
  caseId: string,
  reason?: string,
  requestId?: string
) {
  const { data: c } = await supabase
    .from('community_moderation_cases')
    .select('*, communities(slug)')
    .eq('id', caseId)
    .maybeSingle()
  if (!c) throw new NotFoundError('Case', caseId)

  const canAct = await hasCommunityPermission(
    supabase,
    actorId,
    c.community_id,
    COMMUNITY_PERMISSIONS.MODERATION_REVIEW
  )
  if (!canAct) throw new ForbiddenError('Not allowed')

  await supabase.from('community_moderation_actions').insert({
    case_id: caseId,
    community_id: c.community_id,
    actor_id: actorId,
    action_type: 'CASE_DISMISS',
    target_type: c.target_type,
    target_id: c.target_id,
    target_author_identity_id: c.target_author_identity_id,
    reason: reason || null,
  })

  await supabase
    .from('community_moderation_cases')
    .update({
      status: 'DISMISSED',
      resolved_at: new Date().toISOString(),
      resolved_by: actorId,
      resolution: 'DISMISSED',
      resolution_note: reason || null,
    })
    .eq('id', caseId)

  await supabase
    .from('community_reports')
    .update({
      status: 'DISMISSED',
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
    })
    .eq('case_id', caseId)

  await writeAudit(supabase, {
    actorId,
    action: 'community.moderation.case_dismissed',
    entityType: 'community_moderation_case',
    entityId: caseId,
    scopeType: 'community',
    scopeId: c.community_id,
    requestId,
    metadata: { reason },
  })
}

// -----------------------------------------------------------
// APPEALS
// -----------------------------------------------------------

export async function submitAppeal(
  supabase: SupabaseClient,
  appellantId: string,
  input: {
    community_id: string
    action_id?: string
    case_id?: string
    appeal_type: 'MEMBER_ACTION' | 'CONTENT_ACTION' | 'RESTRICTION'
    body: string
  },
  requestId?: string
) {
  if (!input.body?.trim()) {
    throw new ValidationError([{ field: 'body', message: 'Explanation required' }])
  }

  if (input.action_id) {
    const { data: action } = await supabase
      .from('community_moderation_actions')
      .select('id, target_author_identity_id, community_id')
      .eq('id', input.action_id)
      .maybeSingle()
    if (!action) throw new NotFoundError('Action', input.action_id)
    if (action.target_author_identity_id !== appellantId) {
      throw new ForbiddenError('You can only appeal actions taken against you')
    }
  }

  const { data: appeal, error } = await supabase
    .from('community_appeals')
    .insert({
      community_id: input.community_id,
      appellant_id: appellantId,
      action_id: input.action_id || null,
      case_id: input.case_id || null,
      appeal_type: input.appeal_type,
      body: input.body.trim(),
      status: 'SUBMITTED',
    })
    .select('*')
    .single()

  if (error) {
    if ((error as any).code === '23505') {
      throw new StateConflictError('You already have an open appeal for this')
    }
    throw error
  }

  await writeAudit(supabase, {
    actorId: appellantId,
    action: 'community.appeal.submitted',
    entityType: 'community_appeal',
    entityId: appeal.id,
    scopeType: 'community',
    scopeId: input.community_id,
    requestId,
  })

  const { data: community } = await supabase
    .from('communities')
    .select('name, slug, owner_identity_id')
    .eq('id', input.community_id)
    .maybeSingle()
  if (community?.owner_identity_id) {
    await createNotification(supabase, {
      recipientId: community.owner_identity_id,
      type: 'community_appeal_submitted',
      priority: 'HIGH',
      entityType: 'community_appeal',
      entityId: appeal.id,
      title: `New appeal in ${community.name}`,
      body: input.body.slice(0, 200),
      actionUrl: `/community/${community.slug}/studio/moderation/appeals`,
      fromUserId: appellantId,
      icon: 'alert',
    })
  }

  return { appeal_id: appeal.id }
}

export async function decideAppeal(
  supabase: SupabaseClient,
  actorId: string,
  appealId: string,
  decision: 'UPHELD' | 'OVERTURNED',
  decisionReason?: string,
  requestId?: string
) {
  const { data: appeal } = await supabase
    .from('community_appeals')
    .select('*, communities(name, slug)')
    .eq('id', appealId)
    .maybeSingle()
  if (!appeal) throw new NotFoundError('Appeal', appealId)

  const canDecide = await hasCommunityPermission(
    supabase,
    actorId,
    appeal.community_id,
    COMMUNITY_PERMISSIONS.MODERATION_REMOVE
  )
  if (!canDecide) throw new ForbiddenError('Not allowed')

  if (appeal.status !== 'SUBMITTED' && appeal.status !== 'UNDER_REVIEW') {
    throw new StateConflictError('Appeal already decided')
  }

  await supabase
    .from('community_appeals')
    .update({
      status: decision === 'UPHELD' ? 'UPHELD' : 'OVERTURNED',
      decision,
      decision_reason: decisionReason || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: actorId,
    })
    .eq('id', appealId)

  let restoreError: string | undefined

  if (decision === 'OVERTURNED' && appeal.action_id) {
    const { data: action } = await supabase
      .from('community_moderation_actions')
      .select('*')
      .eq('id', appeal.action_id)
      .maybeSingle()
    if (action && action.target_author_identity_id) {
      await supabase
        .from('community_moderation_actions')
        .update({
          reversed_at: new Date().toISOString(),
          reversed_by: actorId,
          reversal_reason: decisionReason || 'Appeal upheld',
        })
        .eq('id', action.id)

      const restoreMap: Record<string, 'unsuspend' | 'unban' | 'reinstate'> = {
        MEMBER_SUSPEND: 'unsuspend',
        MEMBER_BAN: 'unban',
        MEMBER_REMOVE: 'reinstate',
      }
      const restoreAction = restoreMap[action.action_type]
      if (restoreAction) {
        const { data: membership } = await supabase
          .from('community_memberships')
          .select('id')
          .eq('community_id', action.community_id)
          .eq('identity_id', action.target_author_identity_id)
          .maybeSingle()
        if (membership) {
          try {
            await memberAction(
              supabase,
              actorId,
              membership.id,
              restoreAction,
              `Appeal upheld: ${decisionReason || ''}`
            )
          } catch (e: any) {
            restoreError = String(e?.message || 'restore failed')
            console.warn('[moderation:appeal_restore_failed]', restoreError)
          }
        }
      }

      if (action.action_type === 'CONTENT_REMOVE' || action.action_type === 'CONTENT_HIDE') {
        if (action.target_type === 'post') {
          await supabase
            .from('community_posts_v2')
            .update({ deleted_at: null, deleted_by: null, status: 'PUBLISHED' })
            .eq('id', action.target_id)
        } else if (action.target_type === 'comment') {
          await supabase
            .from('community_comments')
            .update({ deleted_at: null })
            .eq('id', action.target_id)
        }
      }
    }
  }

  await writeAudit(supabase, {
    actorId,
    action: `community.appeal.${decision.toLowerCase()}`,
    entityType: 'community_appeal',
    entityId: appealId,
    scopeType: 'community',
    scopeId: appeal.community_id,
    requestId,
    metadata: {
      decision,
      reason: decisionReason,
      restore_error: restoreError,
    },
  })

  const community = (appeal as any).communities
  await createNotification(supabase, {
    recipientId: appeal.appellant_id,
    type: 'community_appeal_decided',
    priority: 'HIGH',
    entityType: 'community_appeal',
    entityId: appealId,
    title:
      decision === 'UPHELD'
        ? `Your appeal in ${community?.name} was upheld`
        : `Your appeal in ${community?.name} was overturned`,
    body: decisionReason || 'Contact community admins for more details.',
    actionUrl: community?.slug ? `/community/${community.slug}` : '/',
    fromUserId: actorId,
    icon: decision === 'UPHELD' ? 'check' : 'alert',
  })
}

export async function listAppeals(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  status: string = 'SUBMITTED,UNDER_REVIEW'
) {
  const canReview = await hasCommunityPermission(
    supabase,
    actorId,
    communityId,
    COMMUNITY_PERMISSIONS.MODERATION_REVIEW
  )
  if (!canReview) throw new ForbiddenError('Not allowed')

  const statuses = status.split(',')
  const { data: appeals } = await supabase
    .from('community_appeals')
    .select('*')
    .eq('community_id', communityId)
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(50)

  const ids = Array.from(new Set((appeals || []).map((a: any) => a.appellant_id)))
  const { data: users } =
    ids.length > 0
      ? await supabase
          .from('users')
          .select('id, username, full_name, avatar_url')
          .in('id', ids)
      : { data: [] as any[] }
  const map = new Map((users || []).map((u: any) => [u.id, u]))

  return (appeals || []).map((a: any) => ({
    ...a,
    appellant: map.get(a.appellant_id) || null,
  }))
}