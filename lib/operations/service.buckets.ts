// ============================================================
// lib/operations/service.buckets.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ValidationError,
} from '@/lib/kernel'

const COLORS = ['neutral', 'blue', 'green', 'amber', 'red', 'purple'] as const

// -----------------------------------------------------------
// CREATE BOARD
// -----------------------------------------------------------

export async function createBoard(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    community_id?: string | null
    key: string
    name: string
    description?: string
    parent_entity_type?: string
    parent_entity_id?: string
    linked_workflow_id?: string
    buckets?: Array<{
      key: string
      name: string
      color_token?: string
      linked_state_key?: string
      position?: number
    }>
  },
  requestId?: string
) {
  if (!input.key?.match(/^[a-z0-9_-]{2,60}$/)) {
    throw new ValidationError([{ field: 'key', message: 'Invalid key' }])
  }
  if (!input.name?.trim()) {
    throw new ValidationError([{ field: 'name', message: 'Name required' }])
  }

  // Pre-validate bucket color tokens
  const buckets = input.buckets || []
  for (const b of buckets) {
    if (b.color_token && !(COLORS as readonly string[]).includes(b.color_token)) {
      throw new ValidationError([
        { field: 'color_token', message: `Invalid color: ${b.color_token}` },
      ])
    }
  }

  // Resolve linked workflow states BEFORE creating the board — fail fast
  let stateMap = new Map<string, string>()
  if (input.linked_workflow_id) {
    const { data: wf } = await supabase
      .from('operations_workflows')
      .select('published_version, current_version')
      .eq('id', input.linked_workflow_id)
      .maybeSingle()
    const vNum = wf?.published_version || wf?.current_version
    if (vNum) {
      const { data: version } = await supabase
        .from('operations_workflow_versions')
        .select('id')
        .eq('workflow_id', input.linked_workflow_id)
        .eq('version_number', vNum)
        .maybeSingle()
      if (version) {
        const { data: states } = await supabase
          .from('operations_workflow_states')
          .select('id, key')
          .eq('workflow_version_id', version.id)
        for (const s of (states || []) as any[]) stateMap.set(s.key, s.id)
      }
    }
  }

  // 1. Create board
  const { data: board, error } = await supabase
    .from('operations_bucket_boards')
    .insert({
      community_id: input.community_id || null,
      owner_identity_id: actorId,
      key: input.key,
      name: input.name.trim(),
      description: input.description || null,
      parent_entity_type: input.parent_entity_type || null,
      parent_entity_id: input.parent_entity_id || null,
      linked_workflow_id: input.linked_workflow_id || null,
    })
    .select('*')
    .single()
  if (error || !board) throw new Error(`Board creation failed: ${error?.message}`)

  // 2. Seed buckets with compensating cleanup on failure
  if (buckets.length > 0) {
    const rows = buckets.map((b, i) => ({
      board_id: board.id,
      key: b.key,
      name: b.name,
      color_token: b.color_token || 'neutral',
      linked_state_id: b.linked_state_key ? stateMap.get(b.linked_state_key) || null : null,
      position: b.position ?? i,
    }))

    const { error: bucketErr } = await supabase.from('operations_buckets').insert(rows)
    if (bucketErr) {
      // Compensate: delete the empty board so we don't leave an orphan
      await supabase.from('operations_bucket_boards').delete().eq('id', board.id)
      throw new Error(`Bucket seed failed: ${bucketErr.message}`)
    }
  }

  await writeAudit(supabase, {
    actorId,
    action: 'operations.bucket_board.created',
    entityType: 'operations_bucket_board',
    entityId: board.id,
    requestId,
  })

  return board
}

// -----------------------------------------------------------
// GET
// -----------------------------------------------------------

export async function getBoardWithItems(supabase: SupabaseClient, boardId: string) {
  const { data: board } = await supabase
    .from('operations_bucket_boards')
    .select('*')
    .eq('id', boardId)
    .maybeSingle()
  if (!board) throw new NotFoundError('Board', boardId)

  const [{ data: buckets }, { data: items }] = await Promise.all([
    supabase
      .from('operations_buckets')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true }),
    supabase
      .from('operations_bucket_items')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true }),
  ])

  const itemsByBucket = new Map<string, any[]>()
  for (const it of (items || []) as any[]) {
    const arr = itemsByBucket.get(it.bucket_id) || []
    arr.push(it)
    itemsByBucket.set(it.bucket_id, arr)
  }

  return {
    board,
    buckets: (buckets || []).map((b: any) => ({
      ...b,
      items: itemsByBucket.get(b.id) || [],
    })),
  }
}

// -----------------------------------------------------------
// ADD ITEM
// -----------------------------------------------------------

export async function addItemToBoard(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    board_id: string
    bucket_id?: string
    target_entity_type: string
    target_entity_id: string
    workflow_run_id?: string
    metadata?: any
  }
) {
  const { data: board } = await supabase
    .from('operations_bucket_boards')
    .select('*')
    .eq('id', input.board_id)
    .maybeSingle()
  if (!board) throw new NotFoundError('Board', input.board_id)

  let bucketId = input.bucket_id
  if (!bucketId) {
    const { data: first } = await supabase
      .from('operations_buckets')
      .select('id')
      .eq('board_id', input.board_id)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!first) {
      throw new ValidationError([{ field: 'bucket_id', message: 'Board has no buckets yet' }])
    }
    bucketId = first.id
  }

  const { data, error } = await supabase
    .from('operations_bucket_items')
    .insert({
      board_id: input.board_id,
      bucket_id: bucketId,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      workflow_run_id: input.workflow_run_id || null,
      metadata: input.metadata || null,
      added_by: actorId,
    })
    .select('*')
    .single()

  if (error) {
    if ((error as any).code === '23505') {
      // Already exists on this board — return existing
      const { data: existing } = await supabase
        .from('operations_bucket_items')
        .select('*')
        .eq('board_id', input.board_id)
        .eq('target_entity_type', input.target_entity_type)
        .eq('target_entity_id', input.target_entity_id)
        .maybeSingle()
      return existing
    }
    throw error
  }
  return data
}

// -----------------------------------------------------------
// MOVE ITEM
// -----------------------------------------------------------

export async function moveItem(
  supabase: SupabaseClient,
  actorId: string,
  itemId: string,
  toBucketId: string,
  reason?: string,
  requestId?: string
) {
  const { data, error } = await supabase.rpc('rpc_bucket_move', {
    p_item_id: itemId,
    p_to_bucket_id: toBucketId,
    p_actor_id: actorId,
    p_reason: reason || null,
  })
  if (error) throw new Error(error.message)

  await writeAudit(supabase, {
    actorId,
    action: 'operations.bucket.item_moved',
    entityType: 'operations_bucket_item',
    entityId: itemId,
    requestId,
    metadata: { to_bucket_id: toBucketId, reason },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.BUCKET_ITEM_MOVED,
    aggregateType: 'operations_bucket_item',
    aggregateId: itemId,
    actorId,
    payload: { item_id: itemId, to_bucket_id: toBucketId, ...(data as any) },
  })
  const eventId = await writeOutbox(supabase, event)

  return { ...(data as any), event_id: eventId }
}