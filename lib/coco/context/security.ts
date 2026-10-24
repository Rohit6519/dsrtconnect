// ============================================================
// lib/coco/context/security.ts
// ============================================================

import type { CocoClientContextHint, UiStateContext, RegisteredComponentSnapshot } from '@/types/coco'

const MAX_ROUTE_LENGTH = 500
const MAX_PAGE_LENGTH = 100
const MAX_ENTITY_ID_LENGTH = 100
const MAX_COMPONENT_ID_LENGTH = 200
const MAX_UI_STATE_KEYS = 30
const MAX_UI_STATE_VALUE_LENGTH = 500
const MAX_SELECTED_OPTIONS = 20
const MAX_REGISTERED_COMPONENTS = 40
const MAX_ACTIONS_PER_COMPONENT = 20

const ALLOWED_ENTITY_TYPES = new Set([
  'user',
  'project',
  'venture',
  'community',
  'post',
  'mail_thread',
  'opportunity',
  'organization',
  'event',
  'application',
])

export function sanitizeClientHint(raw: unknown): CocoClientContextHint {
  if (!raw || typeof raw !== 'object') {
    throw new Error('COCO_CONTEXT_INVALID: hint must be an object')
  }

  const hint = raw as Record<string, unknown>

  const route =
    typeof hint.route === 'string' ? hint.route.slice(0, MAX_ROUTE_LENGTH) : '/'

  const page =
    typeof hint.page === 'string'
      ? hint.page.slice(0, MAX_PAGE_LENGTH).replace(/[^a-z0-9_\-.]/gi, '')
      : 'unknown'

  let entity: CocoClientContextHint['entity'] | undefined
  if (hint.entity && typeof hint.entity === 'object') {
    const e = hint.entity as Record<string, unknown>
    const type = typeof e.type === 'string' ? e.type : ''
    const id = typeof e.id === 'string' ? e.id.slice(0, MAX_ENTITY_ID_LENGTH) : ''
    if (ALLOWED_ENTITY_TYPES.has(type) && id.length > 0) entity = { type, id }
  }

  let component: CocoClientContextHint['component'] | undefined
  if (hint.component && typeof hint.component === 'object') {
    const c = hint.component as Record<string, unknown>
    const registry_id =
      typeof c.registry_id === 'string'
        ? c.registry_id.slice(0, MAX_COMPONENT_ID_LENGTH).replace(/[^a-z0-9_\-.]/gi, '')
        : ''
    if (registry_id.length > 0) {
      component = {
        registry_id,
        instance_id:
          typeof c.instance_id === 'string' ? c.instance_id.slice(0, MAX_COMPONENT_ID_LENGTH) : undefined,
      }
    }
  }

  const ui_state = sanitizeUiState(hint.ui_state)
  const components = sanitizeRegisteredComponents(hint.components)

  return { route, page, entity, component, ui_state, components }
}

function sanitizeUiState(raw: unknown): UiStateContext | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const src = raw as Record<string, unknown>
  const result: UiStateContext = {}

  if (Array.isArray(src.selected_options)) {
    result.selected_options = src.selected_options
      .slice(0, MAX_SELECTED_OPTIONS)
      .filter((v): v is string => typeof v === 'string')
      .map((v) => v.slice(0, MAX_UI_STATE_VALUE_LENGTH))
  }

  if (src.form_values && typeof src.form_values === 'object') {
    const entries = Object.entries(src.form_values as Record<string, unknown>).slice(0, MAX_UI_STATE_KEYS)
    const clean: Record<string, string | number | boolean | null> = {}
    for (const [k, v] of entries) {
      const key = k.slice(0, 100).replace(/[^a-z0-9_\-.]/gi, '')
      if (!key) continue
      if (v === null) clean[key] = null
      else if (typeof v === 'boolean') clean[key] = v
      else if (typeof v === 'number' && Number.isFinite(v)) clean[key] = v
      else if (typeof v === 'string') clean[key] = v.slice(0, MAX_UI_STATE_VALUE_LENGTH)
    }
    result.form_values = clean
  }

  if (typeof src.active_tab === 'string') result.active_tab = src.active_tab.slice(0, 100)
  if (typeof src.modal_open === 'string' || src.modal_open === null) {
    result.modal_open = src.modal_open as string | null
  }

  return Object.keys(result).length > 0 ? result : undefined
}

function sanitizeRegisteredComponents(raw: unknown): RegisteredComponentSnapshot[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: RegisteredComponentSnapshot[] = []
  for (const item of raw.slice(0, MAX_REGISTERED_COMPONENTS)) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const id =
      typeof rec.id === 'string' ? rec.id.slice(0, MAX_COMPONENT_ID_LENGTH).replace(/[^a-z0-9_\-.]/gi, '') : ''
    if (!id) continue
    const label = typeof rec.label === 'string' ? rec.label.slice(0, 100) : undefined
    const actions = Array.isArray(rec.actions)
      ? rec.actions
          .filter((a): a is string => typeof a === 'string')
          .slice(0, MAX_ACTIONS_PER_COMPONENT)
          .map((a) => a.slice(0, 60).replace(/[^a-z0-9_\-.]/gi, ''))
          .filter(Boolean)
      : []
    let state: any = undefined
    if (rec.state && typeof rec.state === 'object') {
      try {
        state = JSON.parse(JSON.stringify(rec.state))
      } catch {
        state = undefined
      }
    }
    out.push({ id, label, actions, state })
  }
  return out.length ? out : undefined
}

export function stripInjectionMarkers(text: string): string {
  if (!text) return ''
  return text
    .replace(/\bignore (all )?(previous|prior|above) instructions?\b/gi, '[filtered]')
    .replace(/\byou are now\b/gi, '[filtered]')
    .replace(/\bsystem:\s*/gi, '[filtered]:')
    .replace(/\b\[system\]\b/gi, '[filtered]')
    .replace(/```system[\s\S]*?```/gi, '[filtered]')
}