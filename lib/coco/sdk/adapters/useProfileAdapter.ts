// ============================================================
// lib/coco/sdk/adapters/useProfileAdapter.ts
// ============================================================

'use client'

import { useRouter } from 'next/navigation'
import { useCocoComponent } from '../useCocoComponent'

interface Args {
  username: string
  isOwner?: boolean
}

export function useProfileAdapter({ username, isOwner }: Args) {
  const router = useRouter()

  useCocoComponent({
    id: 'profile.overview',
    label: `Profile: @${username}`,
    getState: () => ({ username, isOwner, url: window.location.pathname }),
    actions: {
      view_followers: async () => router.push(`/profile/${username}/followers`),
      view_following: async () => router.push(`/profile/${username}/following`),
      edit_profile: async () => {
        const btn = document.querySelector<HTMLElement>('[data-profile-edit]')
        btn?.click()
      },
      follow: async () => {
        const btn = document.querySelector<HTMLElement>('[data-profile-follow]')
        btn?.click()
      },
      message: async () => {
        const btn = document.querySelector<HTMLElement>('[data-profile-message]')
        btn?.click()
      },
      connect: async () => {
        const btn = document.querySelector<HTMLElement>('[data-profile-connect]')
        btn?.click()
      },
    },
  })
}