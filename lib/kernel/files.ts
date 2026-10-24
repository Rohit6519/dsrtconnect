// ============================================================
// lib/kernel/files.ts
// Signed File Storage & Intent Management.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import { ValidationError, NotFoundError, ForbiddenError } from './errors'
import { safeRandomId } from './context'

// ---------------- MIME Allowlists ----------------

const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
])

const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
])

const VIDEO_MIMES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
])

// Union of everything we allow for the generic "any" context
const ALL_ALLOWED_MIMES = new Set<string>([
  ...IMAGE_MIMES,
  ...DOCUMENT_MIMES,
  ...VIDEO_MIMES,
])

// Explicit denylist for well-known bad types (belt + braces)
const BLOCKED_MIMES = new Set([
  'application/x-msdownload',       // .exe
  'application/x-executable',
  'application/x-sh',
  'application/x-httpd-php',
  'application/x-javascript',
  'text/javascript',
  'application/javascript',
  'text/html',
  'application/xhtml+xml',
])

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB default cap

export type UploadContext = 'image' | 'document' | 'video' | 'any'

function allowedSetFor(context: UploadContext): Set<string> {
  switch (context) {
    case 'image': return IMAGE_MIMES
    case 'document': return DOCUMENT_MIMES
    case 'video': return VIDEO_MIMES
    case 'any':
    default: return ALL_ALLOWED_MIMES
  }
}

function validateMime(mime: string, context: UploadContext) {
  const normalized = String(mime || '').toLowerCase().trim()
  if (!normalized) {
    throw new ValidationError([{ field: 'expected_mime', message: 'MIME type is required' }])
  }
  if (BLOCKED_MIMES.has(normalized)) {
    throw new ValidationError([
      { field: 'expected_mime', message: `File type ${normalized} is not allowed` },
    ])
  }
  const allow = allowedSetFor(context)
  if (!allow.has(normalized)) {
    throw new ValidationError([
      {
        field: 'expected_mime',
        message: `File type ${normalized} not allowed for this upload`,
      },
    ])
  }
}

// ---------------- Types ----------------

export interface RequestUploadIntentParams {
  identityId: string
  entityType?: string
  entityId?: string
  expectedSize: number
  expectedMime: string
  originalName: string
  bucket?: string
  visibility?: 'PRIVATE' | 'PUBLIC' | 'COMMUNITY'
  /**
   * Constrains which MIME types are accepted.
   * Defaults to 'any', which is the union of image + document + video allowlists.
   */
  context?: UploadContext
  /** Optional per-call size cap, cannot exceed MAX_FILE_SIZE_BYTES. */
  maxSizeBytes?: number
}

// ---------------- Intent ----------------

export async function requestUploadIntent(
  supabase: SupabaseClient,
  params: RequestUploadIntentParams
) {
  // ---- validate size ----
  const hardMax = Math.min(params.maxSizeBytes ?? MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_BYTES)
  if (!Number.isFinite(params.expectedSize) || params.expectedSize <= 0) {
    throw new ValidationError([{ field: 'expected_size', message: 'File size required' }])
  }
  if (params.expectedSize > hardMax) {
    throw new ValidationError([
      { field: 'expected_size', message: `File exceeds ${Math.round(hardMax / (1024 * 1024))}MB maximum` },
    ])
  }

  // ---- validate MIME (allowlist) ----
  validateMime(params.expectedMime, params.context ?? 'any')

  // ---- validate name ----
  const safeName = (params.originalName || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 180) || 'file'

  const bucket = params.bucket ?? 'community-assets'
  const fileId = safeRandomId()
  const storageKey = `${params.identityId}/${fileId}-${safeName}`
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

  // 1. Create pending File row
  const { error: fileErr } = await supabase.from('files').insert({
    id: fileId,
    owner_identity_id: params.identityId,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
    storage_bucket: bucket,
    storage_key: storageKey,
    original_name: safeName,
    mime_type: params.expectedMime.toLowerCase(),
    size: params.expectedSize,
    status: 'PENDING',
    visibility: params.visibility ?? 'PRIVATE',
  })
  if (fileErr) throw fileErr

  // 2. Create Upload Intent record
  const { data: intent, error: intentErr } = await supabase
    .from('file_upload_intents')
    .insert({
      identity_id: params.identityId,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      expected_size: params.expectedSize,
      expected_mime: params.expectedMime.toLowerCase(),
      storage_bucket: bucket,
      storage_key: storageKey,
      signed_url_expires_at: expiresAt,
      status: 'PENDING',
      finalized_file_id: fileId,
    })
    .select('*')
    .single()
  if (intentErr) throw intentErr

  // 3. Ask Supabase Storage for a signed upload URL
  const { data: signedData, error: signedErr } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(storageKey)
  if (signedErr) throw signedErr

  return {
    upload_intent_id: intent.id,
    file_id: fileId,
    signed_upload_url: signedData.signedUrl,
    token: (signedData as any).token, // present on modern Supabase JS
    storage_bucket: bucket,
    storage_key: storageKey,
    expires_at: expiresAt,
  }
}

// ---------------- Finalize ----------------

export async function finalizeUpload(
  supabase: SupabaseClient,
  fileId: string,
  identityId: string
) {
  const { data: file, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (error || !file) throw new NotFoundError('File', fileId)
  if (file.owner_identity_id !== identityId) {
    throw new ForbiddenError('You do not own this file')
  }

  await supabase
    .from('files')
    .update({
      status: 'AVAILABLE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', fileId)

  await supabase
    .from('file_upload_intents')
    .update({ status: 'COMPLETED' })
    .eq('finalized_file_id', fileId)

  return {
    file_id: fileId,
    status: 'AVAILABLE',
    storage_key: file.storage_key,
    storage_bucket: file.storage_bucket,
    mime_type: file.mime_type,
    size: file.size,
  }
}

// ---------------- Download ----------------

export async function getSignedDownloadUrl(
  supabase: SupabaseClient,
  fileId: string,
  identityId: string | null
) {
  const { data: file, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (error || !file) throw new NotFoundError('File', fileId)
  if (file.deleted_at) throw new NotFoundError('File', fileId)

  if (file.visibility === 'PRIVATE' && file.owner_identity_id !== identityId) {
    throw new ForbiddenError('Private file access restricted')
  }

  const { data, error: urlErr } = await supabase.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_key, 60 * 60) // 1 hour
  if (urlErr) throw urlErr

  return {
    signed_url: (data as any).signedUrl,
    file_name: file.original_name,
    mime_type: file.mime_type,
    size: file.size,
  }
}