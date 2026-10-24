// ============================================================
// lib/coco/sdk/useCocoComponent.ts
// ============================================================

'use client'

import { useEffect, useRef } from 'react'
import {
  registerCocoComponent,
  type CocoRegisteredComponent,
  type CocoComponentAction,
} from './component-registry'

export interface UseCocoComponentOptions {
  id: string
  label?: string
  getState?: () => any
  actions?: Record<string, CocoComponentAction['handler'] | CocoComponentAction>
  enabled?: boolean
}

export function useCocoComponent(options: UseCocoComponentOptions) {
  const { id, label, getState, actions, enabled = true } = options

  const latest = useRef({ getState, actions })
  latest.current = { getState, actions }

  useEffect(() => {
    // Auto-disable if id is empty (adapter not applicable to current route)
    if (!enabled || !id || id.trim() === '' || id.includes('undefined') || id.endsWith(':')) {
      return
    }

    const normalizedActions: Record<string, CocoComponentAction> = {}
    const src = latest.current.actions || {}
    for (const [name, val] of Object.entries(src)) {
      if (typeof val === 'function') {
        normalizedActions[name] = {
          name,
          handler: (payload) => (latest.current.actions?.[name] as any)?.(payload),
        }
      } else if (val && typeof val === 'object' && 'handler' in val) {
        normalizedActions[name] = {
          name: val.name || name,
          description: val.description,
          handler: (payload) => {
            const current = latest.current.actions?.[name]
            if (typeof current === 'function') return current(payload)
            if (current && typeof current === 'object' && 'handler' in current)
              return current.handler(payload)
          },
        }
      }
    }

    const component: CocoRegisteredComponent = {
      id,
      label,
      getState: () => latest.current.getState?.(),
      actions: normalizedActions,
    }

    return registerCocoComponent(component)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, label, enabled])
}