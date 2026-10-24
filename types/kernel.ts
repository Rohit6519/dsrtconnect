// ============================================================
// types/kernel.ts
// Types for Kernel tables created in Phase 2.
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'DEAD'
export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEAD'
export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'PUSH'
export type FileStatus = 'PENDING' | 'UPLOADING' | 'SCANNING' | 'AVAILABLE' | 'QUARANTINED' | 'DELETED'
export type FileVisibility = 'PRIVATE' | 'PUBLIC' | 'COMMUNITY'
export type UploadIntentStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'
export type SearchIndexOperation = 'INDEX' | 'REINDEX' | 'DELETE'
export type SearchIndexStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED'

export interface KernelOutboxEvent {
  id: string
  event_id: string
  event_type: string
  event_version: number
  aggregate_type: string
  aggregate_id: string
  actor_id: string | null
  correlation_id: string | null
  causation_id: string | null
  payload: Json
  status: OutboxStatus
  attempt_count: number
  locked_at: string | null
  published_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface KernelEventConsumption {
  consumer_name: string
  event_id: string
  processed_at: string
}

export interface KernelAuditLog {
  id: string
  event_id: string | null
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  scope_type: string | null
  scope_id: string | null
  request_id: string | null
  trace_id: string | null
  before: Json | null
  after: Json | null
  metadata: Json | null
  created_at: string
}

export interface KernelJob {
  id: string
  queue: string
  job_type: string
  payload: Json
  status: JobStatus
  attempt: number
  max_attempts: number
  available_at: string
  priority: number
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  last_error: string | null
  idempotency_key: string | null
  created_at: string
  updated_at: string
}

export interface KernelIdempotencyKey {
  key: string
  identity_id: string | null
  endpoint: string
  request_hash: string
  response_status: number | null
  response_body: Json | null
  created_at: string
  expires_at: string
}

export interface KernelRateLimit {
  bucket: string
  subject: string
  count: number
  window_start: string
}

export interface KernelSearchIndexQueueItem {
  id: string
  entity_type: string
  entity_id: string
  operation: SearchIndexOperation
  priority: number
  status: SearchIndexStatus
  attempt_count: number
  last_error: string | null
  processed_at: string | null
  created_at: string
}

export interface KernelFeatureFlag {
  key: string
  enabled: boolean
  rollout_percent: number
  targeting_rules: Json | null
  description: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  type: string
  priority: NotificationPriority
  entity_type: string | null
  entity_id: string | null
  title: string
  body: string | null
  action_url: string | null
  metadata: Json | null
  read_at: string | null
  expires_at: string | null
  created_at: string
}

export interface NotificationPreference {
  identity_id: string
  category: string
  channel: NotificationChannel
  enabled: boolean
  updated_at: string
}

export interface FileRecord {
  id: string
  owner_identity_id: string | null
  entity_type: string | null
  entity_id: string | null
  storage_bucket: string
  storage_key: string
  original_name: string
  mime_type: string
  size: number
  checksum: string | null
  status: FileStatus
  visibility: FileVisibility
  metadata: Json | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface FileUploadIntent {
  id: string
  identity_id: string | null
  entity_type: string | null
  entity_id: string | null
  expected_size: number
  expected_mime: string
  storage_bucket: string
  storage_key: string
  signed_url_expires_at: string
  status: UploadIntentStatus
  finalized_file_id: string | null
  created_at: string
}