// ============================================================
// types/coco/context.ts
// ============================================================

import type { UUID, Timestamp, CocoEntityRef, TrustLevel } from './primitives'
import type { CocoPermissionScope } from './permission'

export interface IdentityContext {
  user_id: UUID
  username?: string
  full_name?: string
  role: 'user' | 'admin' | 'system'
  is_verified: boolean
  onboarding_complete: boolean
}

export interface NavigationContext {
  route: string
  page: string
  breadcrumb?: string[]
}

export interface ComponentContext {
  registry_id: string
  instance_id?: string
  capabilities?: string[]
}

export interface EntityContext extends CocoEntityRef {
  summary?: Record<string, unknown>
}

export interface UiStateContext {
  selected_options?: string[]
  form_values?: Record<string, string | number | boolean | null>
  active_tab?: string
  modal_open?: string | null
}

export interface RelatedEntitiesContext {
  entities: CocoEntityRef[]
  reasons?: Record<string, string>
}

export interface MemoryContext {
  items: Array<{
    key: string
    value: string
    source: string
    confidence: number
  }>
}

export interface KnowledgeContext {
  snippets: Array<{
    source: string
    content: string
    trust: TrustLevel
    relevance_score?: number
  }>
}

/**
 * Snapshot of DSRT components currently mounted on the page.
 * The server surfaces these to the model so COCO knows what it can act on.
 */
export interface RegisteredComponentSnapshot {
  id: string
  label?: string
  actions: string[]
  state?: any
}

export interface CocoContextEnvelope {
  envelope_version: '1'
  snapshot_id: UUID
  created_at: Timestamp

  identity: IdentityContext
  navigation: NavigationContext
  component?: ComponentContext
  entity?: EntityContext
  ui_state?: UiStateContext
  related?: RelatedEntitiesContext
  memory?: MemoryContext
  knowledge?: KnowledgeContext

  /** NEW — live components currently registered on the client */
  registered_components?: RegisteredComponentSnapshot[]

  permissions: CocoPermissionScope[]

  freshness?: Partial<Record<
    'identity' | 'entity' | 'related' | 'memory' | 'knowledge',
    Timestamp
  >>
}

export interface CocoClientContextHint {
  route: string
  page: string
  entity?: {
    type: string
    id: string
  }
  component?: {
    registry_id: string
    instance_id?: string
  }
  ui_state?: UiStateContext
  /** NEW — live component snapshot from the client */
  components?: RegisteredComponentSnapshot[]
}