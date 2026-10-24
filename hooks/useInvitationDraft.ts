'use client'

import { useState, useCallback } from 'react'
import type { DSRTUser } from './useDSRTUserSearch'

export interface InvitationDraft {
  invitedUser: DSRTUser | null
  eligibilityResult: any | null
  positionId: string | null
  positionMode: 'existing' | 'new' | null
  newPositionData: {
    title: string
    positionType: string
    team_name: string
    department: string
    capacity: number
  } | null
  responsibilities: string[]
  requiredSkills: string[]
  roleId: string | null
  permissionTemplate: string
  permissions: string[]
  personalMessage: string
  expirationDays: number
}

const INITIAL_DRAFT: InvitationDraft = {
  invitedUser: null,
  eligibilityResult: null,
  positionId: null,
  positionMode: null,
  newPositionData: null,
  responsibilities: [],
  requiredSkills: [],
  roleId: null,
  permissionTemplate: 'member',
  permissions: ['view_venture', 'view_team', 'publish_updates', 'manage_documents'],
  personalMessage: '',
  expirationDays: 7,
}

export function useInvitationDraft(initial?: Partial<InvitationDraft>) {
  const [draft, setDraft] = useState<InvitationDraft>({
    ...INITIAL_DRAFT,
    ...initial,
  })

  const update = useCallback((patch: Partial<InvitationDraft>) => {
    setDraft(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => setDraft(INITIAL_DRAFT), [])

  return { draft, update, reset }
}