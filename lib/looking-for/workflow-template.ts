// ============================================================
// lib/looking-for/workflow-template.ts
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'

export async function ensureRecruitmentWorkflowTemplate(
  supabase: SupabaseClient,
  actorId: string,
  communityId: string,
  listingTitle: string
) {
  const key = `recruitment_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

  // 1. Create Workflow
  const { data: wf } = await supabase
    .from('operations_workflows')
    .insert({
      community_id: communityId,
      owner_identity_id: actorId,
      key,
      name: `Recruitment: ${listingTitle}`,
      status: 'PUBLISHED',
      current_version: 1,
      published_version: 1,
    })
    .select('*')
    .single()

  if (!wf) throw new Error('Workflow creation failed')

  // 2. Version
  const { data: ver } = await supabase
    .from('operations_workflow_versions')
    .insert({
      workflow_id: wf.id,
      version_number: 1,
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: actorId,
    })
    .select('*')
    .single()

  if (!ver) throw new Error('Workflow version creation failed')

  // 3. States
  const statesDef = [
    { key: 'NEW', name: 'New', is_initial: true, is_terminal: false, color_token: 'blue', pos: 0 },
    { key: 'SHORTLISTED', name: 'Shortlisted', is_initial: false, is_terminal: false, color_token: 'purple', pos: 1 },
    { key: 'INTERVIEW', name: 'Interview', is_initial: false, is_terminal: false, color_token: 'amber', pos: 2 },
    { key: 'OFFER', name: 'Offer Extended', is_initial: false, is_terminal: false, color_token: 'green', pos: 3 },
    { key: 'HIRED', name: 'Hired', is_initial: false, is_terminal: true, color_token: 'green', pos: 4 },
    { key: 'REJECTED', name: 'Rejected', is_initial: false, is_terminal: true, color_token: 'red', pos: 5 },
    { key: 'WITHDRAWN', name: 'Withdrawn', is_initial: false, is_terminal: true, color_token: 'neutral', pos: 6 },
  ]

  const stateRows = await Promise.all(
    statesDef.map(s =>
      supabase
        .from('operations_workflow_states')
        .insert({
          workflow_version_id: ver.id,
          key: s.key,
          name: s.name,
          is_initial: s.is_initial,
          is_terminal: s.is_terminal,
          color_token: s.color_token,
          position: s.pos,
        })
        .select('*')
        .single()
        .then(r => r.data)
    )
  )

  const stateMap = new Map((stateRows || []).map((s: any) => [s.key, s.id]))

  // 4. Transitions
  const transitionsDef = [
    { key: 'shortlist', label: 'Shortlist', from: 'NEW', to: 'SHORTLISTED' },
    { key: 'invite_interview', label: 'Invite to Interview', from: 'SHORTLISTED', to: 'INTERVIEW' },
    { key: 'extend_offer', label: 'Extend Offer', from: 'INTERVIEW', to: 'OFFER' },
    { key: 'hire', label: 'Mark Hired', from: 'OFFER', to: 'HIRED' },
    { key: 'reject_new', label: 'Reject', from: 'NEW', to: 'REJECTED' },
    { key: 'reject_shortlisted', label: 'Reject', from: 'SHORTLISTED', to: 'REJECTED' },
    { key: 'reject_interview', label: 'Reject', from: 'INTERVIEW', to: 'REJECTED' },
  ]

  for (const t of transitionsDef) {
    const fromId = stateMap.get(t.from)
    const toId = stateMap.get(t.to)
    if (fromId && toId) {
      await supabase.from('operations_workflow_transitions').insert({
        workflow_version_id: ver.id,
        from_state_id: fromId,
        to_state_id: toId,
        key: t.key,
        label: t.label,
      })
    }
  }

  // 5. Kanban Board
  const { data: board } = await supabase
    .from('operations_bucket_boards')
    .insert({
      community_id: communityId,
      owner_identity_id: actorId,
      key,
      name: `Board: ${listingTitle}`,
      linked_workflow_id: wf.id,
    })
    .select('*')
    .single()

  if (board) {
    const bucketRows = statesDef.map((s, i) => ({
      board_id: board.id,
      key: s.key.toLowerCase(),
      name: s.name,
      color_token: s.color_token,
      linked_state_id: stateMap.get(s.key),
      position: i,
    }))
    await supabase.from('operations_buckets').insert(bucketRows)
  }

  return { workflow_id: wf.id, board_id: board?.id }
}