// ============================================================
// lib/coco/context/compiler.ts
// ============================================================

import { randomUUID } from 'crypto'
import type {
  CocoClientContextHint,
  CocoContextEnvelope,
  UUID,
  ConversationId,
  Timestamp,
  CocoTaskClass,
} from '@/types/coco'

import { sanitizeClientHint } from './security'
import { resolveUserPermissions } from './permissions'
import { persistSnapshot } from './snapshot'
import { buildFreshnessMap } from './freshness'

import { resolveIdentity } from './resolvers/identity'
import { resolveNavigation } from './resolvers/navigation'
import { resolveComponent } from './resolvers/component'
import { resolveEntity } from './resolvers/entity'
import { resolveRelated } from './resolvers/related'
import { resolveMemory } from './resolvers/memory'
import { resolveKnowledge } from './resolvers/knowledge'
import { resolveUiState } from './resolvers/ui-state'

export interface CompileContextParams {
  userId: UUID
  conversationId?: ConversationId
  rawHint: unknown
  userMessage: string
  taskClass?: CocoTaskClass
  persist?: boolean
}

export interface CompileContextResult {
  envelope: CocoContextEnvelope
  snapshotId: UUID | null
}

export async function compileContext(params: CompileContextParams): Promise<CompileContextResult> {
  const {
    userId,
    conversationId,
    rawHint,
    userMessage,
    taskClass = 'C_GENERATION',
    persist = true,
  } = params

  const hint: CocoClientContextHint = sanitizeClientHint(rawHint)

  const [identity, permSet] = await Promise.all([
    resolveIdentity(userId),
    resolveUserPermissions(userId),
  ])

  const navigation = resolveNavigation(hint)
  const component = resolveComponent(hint)
  const ui_state = resolveUiState(hint)

  const entity = hint.entity
    ? await resolveEntity({ type: hint.entity.type as any, id: hint.entity.id }, userId)
    : undefined

  const needsDeepContext =
    taskClass === 'D_REASONING' ||
    taskClass === 'E_AGENTIC' ||
    taskClass === 'B_RETRIEVAL'

  const [related, memory, knowledge] = await Promise.all([
    needsDeepContext ? resolveRelated(entity, userId) : Promise.resolve(undefined),
    resolveMemory(userId, entity),
    needsDeepContext ? resolveKnowledge(userMessage, entity?.type) : Promise.resolve(undefined),
  ])

  const now = new Date().toISOString() as Timestamp
  const snapshotId = randomUUID() as UUID

  const envelope: CocoContextEnvelope = {
    envelope_version: '1',
    snapshot_id: snapshotId,
    created_at: now,

    identity,
    navigation,
    component,
    entity,
    ui_state,
    related,
    memory,
    knowledge,
    registered_components: hint.components,

    permissions: permSet.scopes,
    freshness: buildFreshnessMap(),
  }

  let persistedId: UUID | null = null
  if (persist) persistedId = await persistSnapshot(envelope, userId, conversationId)

  return { envelope, snapshotId: persistedId || snapshotId }
}