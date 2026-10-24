// ============================================================
// lib/coco/sdk/useCocoContext.ts
// React hook — page-level context declaration.
// Usage: useCocoContext({ page: 'project', entity: { type: 'project', id } })
// ============================================================

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { setCocoContext } from './context-registry'
import type { CocoClientContextHint } from '@/types/coco'

export function useCocoContext(hint: Omit<CocoClientContextHint, 'route'>) {
  const pathname = usePathname()

  useEffect(() => {
    setCocoContext({ ...hint, route: pathname })
  }, [pathname, hint.page, hint.entity?.id, hint.entity?.type, hint.component?.registry_id])
}