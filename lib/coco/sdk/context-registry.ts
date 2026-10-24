// ============================================================
// lib/coco/sdk/context-registry.ts
// ============================================================

'use client'

import type { CocoClientContextHint } from '@/types/coco'
import { snapshotCocoComponents } from './component-registry'

type Listener = (hint: CocoClientContextHint) => void

let currentHint: CocoClientContextHint = {
  route: typeof window !== 'undefined' ? window.location.pathname : '/',
  page: 'unknown',
}
const listeners = new Set<Listener>()

export function setCocoContext(hint: Partial<CocoClientContextHint>) {
  currentHint = {
    ...currentHint,
    ...hint,
    route: hint.route || currentHint.route,
    page: hint.page || currentHint.page,
  }
  listeners.forEach((l) => l(currentHint))
}

export function getCocoContext(): CocoClientContextHint {
  const components = snapshotCocoComponents()
  return {
    ...currentHint,
    components,
  }
}

export function subscribeCocoContext(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}