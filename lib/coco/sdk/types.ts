// ============================================================
// lib/coco/sdk/types.ts
// ============================================================

import type { CocoMessageContent, ConversationId, ActionRunId } from '@/types/coco'

export interface CocoUiMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: CocoMessageContent
  createdAt: number
  streaming?: boolean
  pendingAction?: {
    actionRunId: ActionRunId
    toolName: string
    summary: string
    status: 'pending' | 'confirming' | 'executing' | 'completed' | 'cancelled' | 'failed'
  }
  /** Server-side message id, once persisted */
  serverMessageId?: string
  /** User feedback: 1 like, -1 dislike, 0 none */
  feedback?: 1 | -1 | 0
}

export type CocoLifecycleState =
  | 'idle'
  | 'sending'
  | 'streaming'
  | 'awaiting_confirmation'
  | 'executing'
  | 'error'

export interface CocoContextRegistration {
  hint: import('@/types/coco').CocoClientContextHint
}