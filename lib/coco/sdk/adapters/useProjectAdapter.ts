// ============================================================
// lib/coco/sdk/adapters/useProjectAdapter.ts
// Auto-registers project page with COCO. No page changes required.
// ============================================================

'use client'

import { useRouter } from 'next/navigation'
import { useCocoComponent } from '../useCocoComponent'

interface Args {
  slug: string
}

export function useProjectAdapter({ slug }: Args) {
  const router = useRouter()

  useCocoComponent({
    id: 'project.overview',
    label: `Project: ${slug}`,
    getState: () => {
      const activeTab = document.querySelector<HTMLElement>('[data-project-active-tab]')
        ?.getAttribute('data-project-active-tab') || 'overview'
      return { slug, activeTab, url: window.location.pathname }
    },
    actions: {
      switch_tab: async ({ tab }: any) => {
        const link = document.querySelector<HTMLElement>(`[data-project-tab="${tab}"]`)
        if (link) link.click()
        else router.push(`/projects/${slug}?tab=${tab}`)
      },
      open_edit: async () => {
        const btn = document.querySelector<HTMLElement>('[data-project-edit]')
        btn?.click()
      },
      open_documentation: async () => {
        router.push(`/projects/${slug}?tab=documentation`)
      },
      open_team: async () => {
        router.push(`/projects/${slug}?tab=team`)
      },
      open_applicants: async () => {
        router.push(`/projects/${slug}?tab=applicants`)
      },
      follow: async () => {
        const btn = document.querySelector<HTMLElement>('[data-project-follow]')
        btn?.click()
      },
    },
  })
}