// ============================================================
// lib/coco/sdk/adapters/useMailAdapter.ts
// ============================================================

'use client'

import { useCocoComponent } from '../useCocoComponent'

export function useMailAdapter() {
  useCocoComponent({
    id: 'mail.inbox',
    label: 'DSRT Mail Inbox',
    getState: () => ({
      activeFolder:
        document.querySelector<HTMLElement>('[data-mail-active-folder]')
          ?.getAttribute('data-mail-active-folder') || 'inbox',
      selectedThreadId:
        document.querySelector<HTMLElement>('[data-mail-selected-thread]')
          ?.getAttribute('data-mail-selected-thread') || null,
    }),
    actions: {
      open_compose: async () => {
        window.dispatchEvent(new CustomEvent('coco:mail:open-compose'))
      },
      switch_folder: async ({ folder }: any) => {
        const el = document.querySelector<HTMLElement>(`[data-mail-folder="${folder}"]`)
        el?.click()
      },
      search: async ({ query }: any) => {
        const input = document.querySelector<HTMLInputElement>('[data-mail-search]')
        if (input) {
          input.focus()
          input.value = query
          input.dispatchEvent(new Event('input', { bubbles: true }))
        }
      },
    },
  })
}