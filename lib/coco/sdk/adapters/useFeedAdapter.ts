// ============================================================
// lib/coco/sdk/adapters/useFeedAdapter.ts
// ============================================================

'use client'

import { useCocoComponent } from '../useCocoComponent'

export function useFeedAdapter() {
  useCocoComponent({
    id: 'feed.home',
    label: 'Home Feed',
    getState: () => {
      const activeTab =
        document.querySelector<HTMLElement>('[data-feed-active-tab]')
          ?.getAttribute('data-feed-active-tab') ||
        document.querySelector<HTMLElement>('[data-feed-tab].active')
          ?.getAttribute('data-feed-tab') ||
        'for-you'
      return { activeTab }
    },
    actions: {
      switch_tab: async ({ tab }: any) => {
        const el = document.querySelector<HTMLElement>(`[data-feed-tab="${tab}"]`)
        el?.click()
      },
      open_composer: async () => {
        const btn = document.querySelector<HTMLElement>('[data-feed-composer-trigger]')
        btn?.click()
      },
      refresh: async () => {
        window.dispatchEvent(new CustomEvent('coco:feed:refresh'))
      },
    },
  })
}