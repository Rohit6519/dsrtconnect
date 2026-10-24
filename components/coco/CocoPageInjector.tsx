'use client'

import { useCocoContext } from '@/lib/coco/sdk'
import type { CocoClientContextHint } from '@/types/coco'

/**
 * An invisible client component you can drop into Server Components
 * to register the current page's context with COCO.
 */
export function CocoPageInjector(props: Omit<CocoClientContextHint, 'route'>) {
  useCocoContext(props)
  return null
}