// ============================================================
// lib/coco/sdk/adapters/useInboxThreadAdapter.ts
// ============================================================

'use client'

import { useCocoComponent } from '../useCocoComponent'

interface Args {
  threadId: string
}

export function useInboxThreadAdapter({ threadId }: Args) {
  useCocoComponent({
    id: 'mail.thread',
    label: `Mail thread ${threadId}`,
    getState: () => ({ threadId, url: window.location.pathname }),
    actions: {
      reply: async () => {
        const btn = document.querySelector<HTMLElement>('[data-thread-reply]')
        btn?.click()
      },
      reply_all: async () => {
        const btn = document.querySelector<HTMLElement>('[data-thread-reply-all]')
        btn?.click()
      },
      forward: async () => {
        const btn = document.querySelector<HTMLElement>('[data-thread-forward]')
        btn?.click()
      },
      archive: async () => {
        const btn = document.querySelector<HTMLElement>('[data-thread-archive]')
        btn?.click()
      },
      delete: async () => {
        const btn = document.querySelector<HTMLElement>('[data-thread-delete]')
        btn?.click()
      },
    },
  })
}