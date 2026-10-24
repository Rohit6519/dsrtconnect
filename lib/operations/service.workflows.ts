// ============================================================
// lib/operations/service.workflows.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit,
  writeOutbox,
  createKernelEvent,
  KERNEL_EVENT_TYPES,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  StateConflictError,
} from '@/lib/kernel'
import { WorkflowStateInput, WorkflowTransitionInput } from './types'
import { executeTransitionActions } from './action-registry'
import {
  hasCommunityPermission,
  COMMUNITY_PERMISSIONS,
} from '@/lib/community/permissions'

// -----------------------------------------------------------
// CREATE
// -----------------------------------------------------------

export async function createWorkflow(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    community_id?: string | null
    key: string
    name: string
    description?: string
    purpose?: string
    is_template?: boolean
  },
  requestId?: string
) {
  if (!input.key?.match(/^[a-z0-9_-]{2,60}$/)) {
    throw new ValidationError([{ field: 'key', message: 'Invalid key' }])
  }
  if (!input.name?.trim()) {
    throw new ValidationError([{ field: 'name', message: 'Name required' }])
  }

  const { data: wf, error } = await supabase
    .from('operations_workflows')
    .insert({
      community_id: input.community_id || null,
      owner_identity_id: actorId,
      key: input.key,
      name: input.name.trim(),
      description: input.description || null,
      purpose: input.purpose || null,
      status: 'DRAFT',
      current_version: 1,
      is_template: !!input.is_template,
    })
    .select('*')
    .single()
  if (error || !wf) throw new Error(`Workflow creation failed: ${error?.message}`)

  const { data: v } = await supabase
    .from('operations_workflow_versions')
    .insert({ workflow_id: wf.id, version_number: 1, status: 'DRAFT' })
    .select('*')
    .single()

  await writeAudit(supabase, {
    actorId,
    action: 'operations.workflow.created',
    entityType: 'operations_workflow',
    entityId: wf.id,
    requestId,
  })

  return { workflow: wf, version: v }
}

// -----------------------------------------------------------
// GET
// -----------------------------------------------------------

export async function getWorkflow(
  supabase: SupabaseClient,
  workflowId: string,
  versionNumber?: number
) {
  const { data: wf } = await supabase
    .from('operations_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()
  if (!wf) throw new NotFoundError('Workflow', workflowId)

  const vNum = versionNumber ?? wf.current_version
  const { data: version } = await supabase
    .from('operations_workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('version_number', vNum)
    .maybeSingle()
  if (!version) throw new NotFoundError('WorkflowVersion', String(vNum))

  const [{ data: states }, { data: transitions }] = await Promise.all([
    supabase
      .from('operations_workflow_states')
      .select('*')
      .eq('workflow_version_id', version.id)
      .order('position', { ascending: true }),
    supabase
      .from('operations_workflow_transitions')
      .select('*')
      .eq('workflow_version_id', version.id),
  ])

  const tIds = (transitions || []).map((t: any) => t.id)
  const { data: actions } =
    tIds.length > 0
      ? await supabase
          .from('operations_workflow_actions')
          .select('*')
          .in('transition_id', tIds)
          .order('position', { ascending: true })
      : { data: [] as any[] }

  const actionsByT = new Map<string, any[]>()
  for (const a of (actions || []) as any[]) {
    const arr = actionsByT.get(a.transition_id) || []
    arr.push(a)
    actionsByT.set(a.transition_id, arr)
  }

  return {
    workflow: wf,
    version,
    states: states || [],
    transitions: (transitions || []).map((t: any) => ({
      ...t,
      actions: actionsByT.get(t.id) || [],
    })),
  }
}

// -----------------------------------------------------------
// UPDATE DRAFT — Diff-based, not delete-and-replace
// -----------------------------------------------------------

export async function updateWorkflowDraft(
  supabase: SupabaseClient,
  actorId: string,
  workflowId: string,
  input: {
    name?: string
    description?: string
    states?: WorkflowStateInput[]
    transitions?: WorkflowTransitionInput[]
  },
  requestId?: string
) {
  const { data: wf } = await supabase
    .from('operations_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()
  if (!wf) throw new NotFoundError('Workflow', workflowId)
  if (wf.owner_identity_id !== actorId) {
    throw new ForbiddenError('Not workflow owner')
  }

  // Get or create DRAFT version
  let { data: draft } = await supabase
    .from('operations_workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('version_number', wf.current_version)
    .maybeSingle()

  if (!draft || draft.status !== 'DRAFT') {
    const nextNum = wf.current_version + 1
    const { data: nv } = await supabase
      .from('operations_workflow_versions')
      .insert({ workflow_id: workflowId, version_number: nextNum, status: 'DRAFT' })
      .select('*')
      .single()
    draft = nv
    await supabase
      .from('operations_workflows')
      .update({ current_version: nextNum })
      .eq('id', workflowId)
  }

  // Workflow-level fields
  const patch: Record<string, any> = {}
  if (input.name) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description || null
  if (Object.keys(patch).length > 0) {
    await supabase.from('operations_workflows').update(patch).eq('id', workflowId)
  }

  // ---- Diff-based state update ----
  if (input.states) {
    const initialKeys = input.states.filter((s) => s.is_initial).map((s) => s.key)
    if (initialKeys.length !== 1) {
      throw new ValidationError([
        { field: 'states', message: 'Exactly one initial state required' },
      ])
    }

    const { data: existingStates } = await supabase
      .from('operations_workflow_states')
      .select('id, key')
      .eq('workflow_version_id', draft!.id)

    const existingByKey = new Map((existingStates || []).map((s: any) => [s.key, s.id]))
    const incomingKeys = new Set(input.states.map((s) => s.key))

    // Upsert incoming
    for (let i = 0; i < input.states.length; i++) {
      const s = input.states[i]
      const row = {
        workflow_version_id: draft!.id,
        key: s.key,
        name: s.name,
        description: s.description || null,
        is_initial: !!s.is_initial,
        is_terminal: !!s.is_terminal,
        color_token: s.color_token || 'neutral',
        position: s.position ?? i,
      }
      if (existingByKey.has(s.key)) {
        await supabase
          .from('operations_workflow_states')
          .update(row)
          .eq('id', existingByKey.get(s.key)!)
      } else {
        await supabase.from('operations_workflow_states').insert(row)
      }
    }

    // Delete removed states (last, since transitions may reference them)
    const removedIds: string[] = []
    for (const [key, id] of existingByKey.entries()) {
      if (!incomingKeys.has(key as string)) removedIds.push(id as string)
    }
    if (removedIds.length > 0) {
      // Transitions referencing removed states cascade via FK ON DELETE CASCADE
      await supabase.from('operations_workflow_states').delete().in('id', removedIds)
    }
  }

  // ---- Diff-based transition update ----
  if (input.transitions) {
    const { data: stateRows } = await supabase
      .from('operations_workflow_states')
      .select('id, key')
      .eq('workflow_version_id', draft!.id)
    const stateMap = new Map((stateRows || []).map((s: any) => [s.key, s.id]))

    // Validate all transitions first — fail fast before mutating
    for (const t of input.transitions) {
      if (!stateMap.has(t.from_state_key) || !stateMap.has(t.to_state_key)) {
        throw new ValidationError([
          { field: 'transitions', message: `Transition ${t.key}: state key not found` },
        ])
      }
    }

    const { data: existingTransitions } = await supabase
      .from('operations_workflow_transitions')
      .select('id, key, from_state_id')
      .eq('workflow_version_id', draft!.id)

    // Transitions are keyed by (from_state_id, key) — see uq_workflow_transitions
    // For simplicity, we build a lookup by "fromStateKey:transitionKey"
    const existingByKey = new Map<string, string>()
    for (const et of (existingTransitions || []) as any[]) {
      const fromKey = (stateRows || []).find((s: any) => s.id === et.from_state_id)?.key
      if (fromKey) existingByKey.set(`${fromKey}:${et.key}`, et.id)
    }

    const incomingKeys = new Set(
      input.transitions.map((t) => `${t.from_state_key}:${t.key}`)
    )

    // Upsert incoming transitions
    for (let i = 0; i < input.transitions.length; i++) {
      const t = input.transitions[i]
      const lookupKey = `${t.from_state_key}:${t.key}`
      const row = {
        workflow_version_id: draft!.id,
        from_state_id: stateMap.get(t.from_state_key)!,
        to_state_id: stateMap.get(t.to_state_key)!,
        key: t.key,
        label: t.label,
        required_permission: t.required_permission || null,
        guard_conditions: t.guard_conditions || null,
        position: i,
      }

      let transitionId: string
      if (existingByKey.has(lookupKey)) {
        transitionId = existingByKey.get(lookupKey)!
        await supabase
          .from('operations_workflow_transitions')
          .update(row)
          .eq('id', transitionId)
      } else {
        const { data: newT, error: insErr } = await supabase
          .from('operations_workflow_transitions')
          .insert(row)
          .select('id')
          .single()
        if (insErr || !newT) throw new Error(`Transition insert failed: ${insErr?.message}`)
        transitionId = newT.id
      }

      // Actions — always full-replace since they're an ordered list
      await supabase
        .from('operations_workflow_actions')
        .delete()
        .eq('transition_id', transitionId)
      if (t.actions && t.actions.length > 0) {
        const actionRows = t.actions.map((a, ai) => ({
          transition_id: transitionId,
          action_type: a.action_type,
          params: a.params || null,
          position: a.position ?? ai,
          run_async: a.run_async !== false,
        }))
        await supabase.from('operations_workflow_actions').insert(actionRows)
      }
    }

    // Delete removed transitions
    const removedIds: string[] = []
    for (const [key, id] of existingByKey.entries()) {
      if (!incomingKeys.has(key)) removedIds.push(id)
    }
    if (removedIds.length > 0) {
      await supabase.from('operations_workflow_transitions').delete().in('id', removedIds)
    }
  }

  await writeAudit(supabase, {
    actorId,
    action: 'operations.workflow.draft_updated',
    entityType: 'operations_workflow',
    entityId: workflowId,
    requestId,
    metadata: { version_number: draft!.version_number },
  })

  return getWorkflow(supabase, workflowId, draft!.version_number)
}

// -----------------------------------------------------------
// PUBLISH
// -----------------------------------------------------------

export async function publishWorkflowVersion(
  supabase: SupabaseClient,
  actorId: string,
  workflowId: string,
  requestId?: string
) {
  const { data: wf } = await supabase
    .from('operations_workflows')
    .select('*')
    .eq('id', workflowId)
    .maybeSingle()
  if (!wf) throw new NotFoundError('Workflow', workflowId)
  if (wf.owner_identity_id !== actorId) throw new ForbiddenError('Not workflow owner')

  const { data: draft } = await supabase
    .from('operations_workflow_versions')
    .select('*')
    .eq('workflow_id', workflowId)
    .eq('version_number', wf.current_version)
    .maybeSingle()
  if (!draft) throw new NotFoundError('WorkflowVersion', String(wf.current_version))
  if (draft.status !== 'DRAFT') throw new StateConflictError('Version not DRAFT')

  const full = await getWorkflow(supabase, workflowId, wf.current_version)
  const snapshot = {
    workflow: full.workflow,
    states: full.states,
    transitions: full.transitions,
    frozen_at: new Date().toISOString(),
  }

  await supabase
    .from('operations_workflow_versions')
    .update({
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: actorId,
      schema_snapshot: snapshot,
    })
    .eq('id', draft.id)

  await supabase
    .from('operations_workflows')
    .update({ status: 'PUBLISHED', published_version: wf.current_version })
    .eq('id', workflowId)

  await writeAudit(supabase, {
    actorId,
    action: 'operations.workflow.published',
    entityType: 'operations_workflow',
    entityId: workflowId,
    requestId,
    metadata: { version_number: wf.current_version },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.WORKFLOW_PUBLISHED,
    aggregateType: 'operations_workflow',
    aggregateId: workflowId,
    actorId,
    payload: { workflow_id: workflowId, version_number: wf.current_version },
  })
  const eventId = await writeOutbox(supabase, event)

  return { event_id: eventId }
}

// -----------------------------------------------------------
// RUNS
// -----------------------------------------------------------

export async function startWorkflowRun(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    workflow_id: string
    target_entity_type: string
    target_entity_id: string
    subject_identity_id?: string
    metadata?: any
  },
  requestId?: string
): Promise<{ run_id: string; state_id: string }> {
  const { data: wf } = await supabase
    .from('operations_workflows')
    .select('*')
    .eq('id', input.workflow_id)
    .maybeSingle()
  if (!wf) throw new NotFoundError('Workflow', input.workflow_id)
  if (wf.status !== 'PUBLISHED') throw new StateConflictError('Workflow not published')

  const versionNumber = wf.published_version || wf.current_version
  const { data: version } = await supabase
    .from('operations_workflow_versions')
    .select('id')
    .eq('workflow_id', wf.id)
    .eq('version_number', versionNumber)
    .maybeSingle()
  if (!version) throw new NotFoundError('WorkflowVersion', String(versionNumber))

  const { data: initial } = await supabase
    .from('operations_workflow_states')
    .select('*')
    .eq('workflow_version_id', version.id)
    .eq('is_initial', true)
    .maybeSingle()
  if (!initial) throw new StateConflictError('No initial state on this workflow version')

  const { data: run, error } = await supabase
    .from('operations_workflow_runs')
    .insert({
      workflow_id: wf.id,
      workflow_version_id: version.id,
      current_state_id: initial.id,
      target_entity_type: input.target_entity_type,
      target_entity_id: input.target_entity_id,
      subject_identity_id: input.subject_identity_id || null,
      metadata: input.metadata || null,
    })
    .select('*')
    .single()
  if (error || !run) throw new Error(`Run creation failed: ${error?.message}`)

  await supabase.from('operations_workflow_history').insert({
    run_id: run.id,
    from_state_id: null,
    to_state_id: initial.id,
    actor_id: actorId,
    reason: 'Run started',
  })

  await writeAudit(supabase, {
    actorId,
    action: 'operations.workflow.run.started',
    entityType: 'operations_workflow_run',
    entityId: run.id,
    requestId,
    metadata: { workflow_id: wf.id },
  })

  return { run_id: run.id, state_id: initial.id }
}

export async function transitionRun(
  supabase: SupabaseClient,
  actorId: string,
  runId: string,
  transitionKey: string,
  reason?: string,
  requestId?: string
) {
  const { data: run } = await supabase
    .from('operations_workflow_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()
  if (!run) throw new NotFoundError('Run', runId)

  const { data: wf } = await supabase
    .from('operations_workflows')
    .select('community_id, owner_identity_id')
    .eq('id', run.workflow_id)
    .maybeSingle()

  const isOwner = wf?.owner_identity_id === actorId
  let canTransition = isOwner

  if (!canTransition && wf?.community_id) {
    // Uses the OWNER/ADMIN auto-pass from Phase A
    canTransition = await hasCommunityPermission(
      supabase,
      actorId,
      wf.community_id,
      COMMUNITY_PERMISSIONS.COMMUNITY_UPDATE
    )
  }

  if (!canTransition) throw new ForbiddenError('Not allowed to transition this run')

  const { data, error } = await supabase.rpc('rpc_workflow_transition', {
    p_run_id: runId,
    p_transition_key: transitionKey,
    p_actor_id: actorId,
    p_reason: reason || null,
  })
  if (error) throw new Error(error.message)
  const result = data as any

  await executeTransitionActions(
    {
      supabase,
      runId,
      actorId,
      subjectIdentityId: run.subject_identity_id,
      targetEntityType: run.target_entity_type,
      targetEntityId: run.target_entity_id,
      transitionId: result?.transition_id || null,
      correlationId: requestId,
    },
    result.transition_id
  )

  await writeAudit(supabase, {
    actorId,
    action: 'operations.workflow.transitioned',
    entityType: 'operations_workflow_run',
    entityId: runId,
    requestId,
    metadata: { transition_key: transitionKey, ...result },
  })

  const event = createKernelEvent({
    eventType: KERNEL_EVENT_TYPES.WORKFLOW_TRANSITIONED,
    aggregateType: 'operations_workflow_run',
    aggregateId: runId,
    actorId,
    payload: {
      ...result,
      workflow_id: run.workflow_id,
      target: { type: run.target_entity_type, id: run.target_entity_id },
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { ...result, event_id: eventId }
}

export async function getRunDetail(supabase: SupabaseClient, runId: string) {
  const { data: run } = await supabase
    .from('operations_workflow_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()
  if (!run) throw new NotFoundError('Run', runId)

  const [
    { data: state },
    { data: history },
    { data: transitions },
  ] = await Promise.all([
    supabase
      .from('operations_workflow_states')
      .select('*')
      .eq('id', run.current_state_id)
      .maybeSingle(),
    supabase
      .from('operations_workflow_history')
      .select('*')
      .eq('run_id', runId)
      .order('created_at', { ascending: true }),
    supabase
      .from('operations_workflow_transitions')
      .select('id, key, label, from_state_id, to_state_id')
      .eq('workflow_version_id', run.workflow_version_id)
      .eq('from_state_id', run.current_state_id),
  ])

  return {
    run,
    current_state: state,
    history: history || [],
    available_transitions: transitions || [],
  }
}