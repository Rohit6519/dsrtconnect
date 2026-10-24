// ============================================================
// lib/community/state-machines.ts
// Enforces valid state transitions.
// ============================================================

import type { CommunityStatus, MembershipStatus, ApplicationStatus, InvitationStatus } from './types'
import { StateConflictError } from '@/lib/kernel'

const COMMUNITY_TRANSITIONS: Record<CommunityStatus, CommunityStatus[]> = {
  DRAFT: ['PENDING_REVIEW', 'ACTIVE', 'ARCHIVED'],
  PENDING_REVIEW: ['ACTIVE', 'DRAFT', 'ARCHIVED'],
  ACTIVE: ['SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
}

const MEMBERSHIP_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  APPLIED: ['ACTIVE', 'REJECTED', 'PENDING'],
  INVITED: ['ACTIVE', 'REJECTED'],
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['SUSPENDED', 'BANNED', 'LEFT', 'REMOVED'],
  SUSPENDED: ['ACTIVE', 'BANNED', 'REMOVED'],
  BANNED: ['ACTIVE', 'REMOVED'],
  LEFT: ['ACTIVE'],
  REMOVED: ['ACTIVE'],
  REJECTED: ['ACTIVE'],
}

const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT: ['SUBMITTED', 'WITHDRAWN'],
  SUBMITTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'WITHDRAWN'],
  APPROVED: [],
  REJECTED: [],
  WITHDRAWN: [],
  EXPIRED: [],
}

const INVITATION_TRANSITIONS: Record<InvitationStatus, InvitationStatus[]> = {
  PENDING: ['ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED'],
  ACCEPTED: [],
  DECLINED: [],
  REVOKED: [],
  EXPIRED: [],
}

export function assertCommunityTransition(from: CommunityStatus, to: CommunityStatus) {
  if (from === to) return
  const allowed = COMMUNITY_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new StateConflictError(
      `Cannot transition community from ${from} to ${to}`,
      { current_state: from, requested_transition: to }
    )
  }
}

export function assertMembershipTransition(from: MembershipStatus, to: MembershipStatus) {
  if (from === to) return
  const allowed = MEMBERSHIP_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new StateConflictError(
      `Cannot transition membership from ${from} to ${to}`,
      { current_state: from, requested_transition: to }
    )
  }
}

export function assertApplicationTransition(from: ApplicationStatus, to: ApplicationStatus) {
  if (from === to) return
  const allowed = APPLICATION_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new StateConflictError(
      `Cannot transition application from ${from} to ${to}`,
      { current_state: from, requested_transition: to }
    )
  }
}

export function assertInvitationTransition(from: InvitationStatus, to: InvitationStatus) {
  if (from === to) return
  const allowed = INVITATION_TRANSITIONS[from] || []
  if (!allowed.includes(to)) {
    throw new StateConflictError(
      `Cannot transition invitation from ${from} to ${to}`,
      { current_state: from, requested_transition: to }
    )
  }
}