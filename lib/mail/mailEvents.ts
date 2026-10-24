export const MAIL_EVENTS = {
  refresh: 'mail:refresh',
  countsRefresh: 'mail:counts:refresh',
  openDraft: 'mail:open_draft',
  identitiesRefresh: 'mail:identities:refresh',
  threadRefresh: 'mail:thread:refresh',
  draftConflict: 'mail:draft_conflict',
} as const

export function emitMailRefresh() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(MAIL_EVENTS.refresh))
  window.dispatchEvent(new Event(MAIL_EVENTS.countsRefresh))
}

export function emitOpenDraft(draft: any) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MAIL_EVENTS.openDraft, { detail: draft }))
}

export function emitDraftConflict(payload: { draftId: string; updatedAt?: string }) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(MAIL_EVENTS.draftConflict, { detail: payload }))
}