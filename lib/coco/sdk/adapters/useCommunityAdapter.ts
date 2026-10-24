// ============================================================
// lib/coco/sdk/adapters/useCommunityAdapter.ts
// ============================================================

'use client'

import { useRouter } from 'next/navigation'
import { useCocoComponent } from '../useCocoComponent'

interface Args {
  slug: string
  tab?: string
}

export function useCommunityAdapter({ slug, tab }: Args) {
  const router = useRouter()

  useCocoComponent({
    id: 'community.overview',
    label: `Community: ${slug}`,
    getState: () => ({ slug, tab, url: window.location.pathname }),
    actions: {
      switch_tab: async ({ tab: newTab }: any) => {
        router.push(`/community/${slug}/${newTab || 'overview'}`)
      },
      open_events: async () => router.push(`/community/${slug}/events`),
      open_people: async () => router.push(`/community/${slug}/people`),
      open_discussion: async () => router.push(`/community/${slug}/discussion`),
      open_projects: async () => router.push(`/community/${slug}/projects`),
      join: async () => {
        const btn = document.querySelector<HTMLElement>('[data-community-join]')
        btn?.click()
      },
      leave: async () => {
        const btn = document.querySelector<HTMLElement>('[data-community-leave]')
        btn?.click()
      },
    },
  })
}