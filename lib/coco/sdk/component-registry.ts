// ============================================================
// lib/coco/sdk/component-registry.ts
// Universal DSRT component registry.
// Any React component can register itself so COCO knows:
//   1. It exists on this page
//   2. What actions it supports
//   3. How to fetch its current state
// ============================================================

'use client'

export interface CocoComponentAction {
  /** Action name, e.g. "fill", "click", "toggle", "select", "submit" */
  name: string
  /** Human description shown to the model. */
  description?: string
  /** Handler invoked when COCO dispatches this action. */
  handler: (payload?: any) => void | Promise<void>
}

export interface CocoRegisteredComponent {
  /** Global unique id: "mail.composer", "project.overview", "feed.composer" */
  id: string
  /** Optional label for UI/logs */
  label?: string
  /** Function returning a plain JSON summary of current state for COCO context. */
  getState?: () => any
  /** All actions COCO can dispatch on this component. */
  actions: Record<string, CocoComponentAction>
}

type Listener = () => void

const registry = new Map<string, CocoRegisteredComponent>()
const listeners = new Set<Listener>()

// ────────────────────────────────────────────────────────────
// Registration lifecycle
// ────────────────────────────────────────────────────────────

export function registerCocoComponent(component: CocoRegisteredComponent): () => void {
  registry.set(component.id, component)
  notify()
  return () => {
    // Only unregister if the current entry is the same instance
    if (registry.get(component.id) === component) {
      registry.delete(component.id)
      notify()
    }
  }
}

export function getCocoComponent(id: string): CocoRegisteredComponent | undefined {
  return registry.get(id)
}

export function listCocoComponents(): CocoRegisteredComponent[] {
  return Array.from(registry.values())
}

// ────────────────────────────────────────────────────────────
// Snapshot: sent up to the server as context.
// Only sends `id`, `label`, and shallow state — NOT handlers.
// ────────────────────────────────────────────────────────────

export interface CocoComponentSnapshot {
  id: string
  label?: string
  actions: string[]
  state?: any
}

export function snapshotCocoComponents(): CocoComponentSnapshot[] {
  const out: CocoComponentSnapshot[] = []
  registry.forEach((c) => {
    let state: any = undefined
    try {
      state = c.getState?.()
    } catch {
      state = { error: 'getState_failed' }
    }
    out.push({
      id: c.id,
      label: c.label,
      actions: Object.keys(c.actions),
      state,
    })
  })
  return out
}

// ────────────────────────────────────────────────────────────
// Dispatcher — called by the SDK Action Bridge when COCO fires an action
// ────────────────────────────────────────────────────────────

export async function dispatchCocoComponentAction(
  componentId: string,
  actionName: string,
  payload?: any
): Promise<{ ok: boolean; error?: string; result?: any }> {
  const component = registry.get(componentId)
  if (!component) return { ok: false, error: `Component "${componentId}" not registered` }

  const action = component.actions[actionName]
  if (!action) return { ok: false, error: `Action "${actionName}" not found on "${componentId}"` }

  try {
    const result = await action.handler(payload)
    return { ok: true, result }
  } catch (err: any) {
    return { ok: false, error: err?.message || 'action_failed' }
  }
}

// ────────────────────────────────────────────────────────────
// Subscription (for future devtools panel)
// ────────────────────────────────────────────────────────────

function notify() {
  listeners.forEach((l) => {
    try {
      l()
    } catch {}
  })
}

export function subscribeCocoComponents(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}