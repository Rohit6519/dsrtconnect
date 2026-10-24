// ============================================================
// lib/coco/sdk/adapters/useOpportunityAdapter.ts
// ============================================================

'use client'

import { useRouter } from 'next/navigation'
import { useCocoComponent } from '../useCocoComponent'

interface Args {
  id: string
}

export function useOpportunityAdapter({ id }: Args) {
  const router = useRouter()

  useCocoComponent({
    id: 'opportunity.detail',
    label: `Opportunity ${id}`,
    getState: () => ({ id, url: window.location.pathname }),
    actions: {
      apply: async () => router.push(`/looking-for/${id}/apply`),
      save: async () => {
        const btn = document.querySelector<HTMLElement>('[data-opportunity-save]')
        btn?.click()
      },
      share: async () => {
        const btn = document.querySelector<HTMLElement>('[data-opportunity-share]')
        btn?.click()
      },
      report: async () => {
        const btn = document.querySelector<HTMLElement>('[data-opportunity-report]')
        btn?.click()
      },
    },
  })
}