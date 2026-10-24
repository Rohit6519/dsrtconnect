// ============================================================
// lib/coco/sdk/adapters/useVentureAdapter.ts
// ============================================================

'use client'

import { useRouter } from 'next/navigation'
import { useCocoComponent } from '../useCocoComponent'

interface Args {
  slug: string
}

export function useVentureAdapter({ slug }: Args) {
  const router = useRouter()

  useCocoComponent({
    id: 'venture.overview',
    label: `Venture: ${slug}`,
    getState: () => ({
      slug,
      url: window.location.pathname,
      activeTab:
        document.querySelector<HTMLElement>('[data-venture-active-tab]')
          ?.getAttribute('data-venture-active-tab') || 'overview',
    }),
    actions: {
      switch_tab: async ({ tab }: any) => {
        const link = document.querySelector<HTMLElement>(`[data-venture-tab="${tab}"]`)
        if (link) link.click()
        else router.push(`/ventures/${slug}?tab=${tab}`)
      },
      open_assessment: async () => router.push(`/ventures/${slug}/assessment/review`),
      open_founder: async () => router.push(`/ventures/${slug}/founder`),
      follow: async () => {
        const btn = document.querySelector<HTMLElement>('[data-venture-follow]')
        btn?.click()
      },
      apply: async () => {
        const btn = document.querySelector<HTMLElement>('[data-venture-apply]')
        btn?.click()
      },
    },
  })
}