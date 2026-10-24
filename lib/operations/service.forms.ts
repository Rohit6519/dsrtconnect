// ============================================================
// lib/operations/service.forms.ts
// Form + submission service.
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js'
import {
  writeAudit, writeOutbox, createKernelEvent,
  NotFoundError, ForbiddenError, ValidationError, StateConflictError,
} from '@/lib/kernel'
import { QUESTION_TYPES, QuestionType, FormQuestionInput, FormRuleInput } from './types'
import { validateAnswer, applyRules, AnswerInput, QuestionDef } from './validators'

// -----------------------------------------------------------
// CREATE / GET / UPDATE FORM (draft)
// -----------------------------------------------------------

export async function createForm(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    community_id?: string | null
    key: string
    name: string
    description?: string
    purpose?: string
  },
  requestId?: string
) {
  if (!input.key?.match(/^[a-z0-9_-]{2,60}$/)) {
    throw new ValidationError([{ field: 'key', message: 'key must be lowercase alphanumeric (2-60 chars)' }])
  }
  if (!input.name?.trim()) throw new ValidationError([{ field: 'name', message: 'Name required' }])

  const { data: form, error } = await supabase
    .from('operations_forms')
    .insert({
      community_id: input.community_id || null,
      owner_identity_id: actorId,
      key: input.key,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      purpose: input.purpose || null,
      status: 'DRAFT',
      current_version: 1,
    })
    .select('*')
    .single()
  if (error || !form) throw new Error(`Form creation failed: ${error?.message}`)

  // Bootstrap v1
  const { data: version } = await supabase
    .from('operations_form_versions')
    .insert({ form_id: form.id, version_number: 1, status: 'DRAFT' })
    .select('*')
    .single()

  await writeAudit(supabase, {
    actorId,
    action: 'operations.form.created',
    entityType: 'operations_form',
    entityId: form.id,
    requestId,
  })

  return { form, version }
}

export async function getForm(
  supabase: SupabaseClient,
  actorId: string,
  formId: string,
  opts?: { versionNumber?: number }
) {
  const { data: form } = await supabase.from('operations_forms').select('*').eq('id', formId).maybeSingle()
  if (!form) throw new NotFoundError('Form', formId)

  const versionNumber = opts?.versionNumber ?? form.current_version
  const { data: version } = await supabase
    .from('operations_form_versions')
    .select('*')
    .eq('form_id', formId)
    .eq('version_number', versionNumber)
    .maybeSingle()
  if (!version) throw new NotFoundError('FormVersion', String(versionNumber))

  const [{ data: sections }, { data: questions }, { data: options }, { data: rules }] = await Promise.all([
    supabase.from('operations_form_sections').select('*').eq('form_version_id', version.id).order('position', { ascending: true }),
    supabase.from('operations_form_questions').select('*').eq('form_version_id', version.id).order('position', { ascending: true }),
    supabase.from('operations_form_options').select('*').eq('question_id', 'placeholder'), // filled below
    supabase.from('operations_form_rules').select('*').eq('form_version_id', version.id).order('position', { ascending: true }),
  ])

  // Real fetch of options for these questions
  const qIds = (questions || []).map((q: any) => q.id)
  const { data: opts2 } = qIds.length > 0
    ? await supabase.from('operations_form_options').select('*').in('question_id', qIds).order('position', { ascending: true })
    : { data: [] as any[] }

  const optsByQ = new Map<string, any[]>()
  for (const o of (opts2 || []) as any[]) {
    const arr = optsByQ.get(o.question_id) || []
    arr.push(o)
    optsByQ.set(o.question_id, arr)
  }

  const enrichedQuestions = (questions || []).map((q: any) => ({
    ...q,
    options: optsByQ.get(q.id) || [],
  }))

  return {
    form,
    version,
    sections: sections || [],
    questions: enrichedQuestions,
    rules: rules || [],
  }
}

export async function updateFormDraft(
  supabase: SupabaseClient,
  actorId: string,
  formId: string,
  input: {
    name?: string
    description?: string
    purpose?: string
    sections?: Array<{ key: string; title: string; description?: string; position?: number }>
    questions?: FormQuestionInput[]
    rules?: FormRuleInput[]
  },
  requestId?: string
) {
  const { data: form } = await supabase.from('operations_forms').select('*').eq('id', formId).maybeSingle()
  if (!form) throw new NotFoundError('Form', formId)
  if (form.owner_identity_id !== actorId) throw new ForbiddenError('Not form owner')

  // Draft version = current_version if it's DRAFT, else create next
  let { data: draftVersion } = await supabase
    .from('operations_form_versions')
    .select('*')
    .eq('form_id', formId)
    .eq('version_number', form.current_version)
    .maybeSingle()

  if (!draftVersion || draftVersion.status !== 'DRAFT') {
    const nextNum = form.current_version + 1
    const { data: nv } = await supabase
      .from('operations_form_versions')
      .insert({ form_id: formId, version_number: nextNum, status: 'DRAFT' })
      .select('*')
      .single()
    draftVersion = nv
    await supabase.from('operations_forms').update({ current_version: nextNum }).eq('id', formId)
  }

  // Update form fields
  const patch: any = {}
  if (input.name) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.purpose !== undefined) patch.purpose = input.purpose || null
  if (Object.keys(patch).length > 0) await supabase.from('operations_forms').update(patch).eq('id', formId)

  // Replace sections
  if (input.sections) {
    await supabase.from('operations_form_sections').delete().eq('form_version_id', draftVersion!.id)
    if (input.sections.length > 0) {
      const rows = input.sections.map((s, i) => ({
        form_version_id: draftVersion!.id,
        key: s.key,
        title: s.title,
        description: s.description || null,
        position: s.position ?? i,
      }))
      await supabase.from('operations_form_sections').insert(rows)
    }
  }

  // Replace questions + options
  if (input.questions) {
    for (const q of input.questions) {
      if (!QUESTION_TYPES.includes(q.type)) {
        throw new ValidationError([{ field: 'type', message: `Invalid question type ${q.type}` }])
      }
      if (!q.key?.match(/^[a-z0-9_]{2,60}$/i)) {
        throw new ValidationError([{ field: 'key', message: `Invalid question key ${q.key}` }])
      }
    }
    await supabase.from('operations_form_questions').delete().eq('form_version_id', draftVersion!.id)

    // Resolve sections
    const { data: allSections } = await supabase
      .from('operations_form_sections')
      .select('id, key')
      .eq('form_version_id', draftVersion!.id)
    const sectionMap = new Map((allSections || []).map((s: any) => [s.key, s.id]))

    const inserted: Array<{ id: string; key: string; options?: any[] }> = []
    for (let i = 0; i < input.questions.length; i++) {
      const q = input.questions[i]
      const { data: qRow, error: qErr } = await supabase
        .from('operations_form_questions')
        .insert({
          form_version_id: draftVersion!.id,
          section_id: q.section_key ? sectionMap.get(q.section_key) || null : null,
          key: q.key,
          label: q.label,
          description: q.description || null,
          type: q.type,
          required: !!q.required,
          position: q.position ?? i,
          placeholder: q.placeholder || null,
          default_value: q.default_value ?? null,
          validation_rules: q.validation_rules || null,
          metadata: q.metadata || null,
        })
        .select('*')
        .single()
      if (qErr || !qRow) throw new Error(`Question insert failed: ${qErr?.message}`)
      inserted.push({ id: qRow.id, key: qRow.key, options: q.options })
    }

    // Insert options
    for (const it of inserted) {
      if (it.options && it.options.length > 0) {
        const optRows = it.options.map((o, i) => ({
          question_id: it.id,
          value: o.value,
          label: o.label,
          position: i,
        }))
        await supabase.from('operations_form_options').insert(optRows)
      }
    }

    // Replace rules
    if (input.rules) {
      await supabase.from('operations_form_rules').delete().eq('form_version_id', draftVersion!.id)
      const qByKey = new Map(inserted.map((q) => [q.key, q.id]))
      const ruleRows = input.rules.map((r, i) => ({
        form_version_id: draftVersion!.id,
        rule_type: r.rule_type,
        condition: r.condition,
        action: { rule_type: r.rule_type, target_question_key: r.target_question_key },
        target_question_id: qByKey.get(r.target_question_key) || null,
        position: i,
      }))
      if (ruleRows.length > 0) await supabase.from('operations_form_rules').insert(ruleRows)
    }
  }

  await writeAudit(supabase, {
    actorId,
    action: 'operations.form.draft_updated',
    entityType: 'operations_form',
    entityId: formId,
    requestId,
    metadata: { version_number: draftVersion!.version_number },
  })

  return getForm(supabase, actorId, formId, { versionNumber: draftVersion!.version_number })
}

// -----------------------------------------------------------
// PUBLISH version — freezes schema snapshot
// -----------------------------------------------------------

export async function publishFormVersion(
  supabase: SupabaseClient,
  actorId: string,
  formId: string,
  requestId?: string
) {
  const { data: form } = await supabase.from('operations_forms').select('*').eq('id', formId).maybeSingle()
  if (!form) throw new NotFoundError('Form', formId)
  if (form.owner_identity_id !== actorId) throw new ForbiddenError('Not form owner')

  const { data: draft } = await supabase
    .from('operations_form_versions')
    .select('*')
    .eq('form_id', formId)
    .eq('version_number', form.current_version)
    .maybeSingle()
  if (!draft) throw new NotFoundError('FormVersion', String(form.current_version))
  if (draft.status !== 'DRAFT') throw new StateConflictError('Version is not DRAFT')

  const full = await getForm(supabase, actorId, formId, { versionNumber: form.current_version })
  const snapshot = {
    form: full.form,
    sections: full.sections,
    questions: full.questions,
    rules: full.rules,
    frozen_at: new Date().toISOString(),
  }

  await supabase
    .from('operations_form_versions')
    .update({
      status: 'PUBLISHED',
      published_at: new Date().toISOString(),
      published_by: actorId,
      schema_snapshot: snapshot,
    })
    .eq('id', draft.id)

  await supabase
    .from('operations_forms')
    .update({ status: 'PUBLISHED', published_version: form.current_version })
    .eq('id', formId)

  await writeAudit(supabase, {
    actorId,
    action: 'operations.form.published',
    entityType: 'operations_form',
    entityId: formId,
    requestId,
    metadata: { version_number: form.current_version },
  })

  const event = createKernelEvent({
    eventType: 'operations.form.published',
    aggregateType: 'operations_form',
    aggregateId: formId,
    actorId,
    payload: { form_id: formId, version_number: form.current_version },
  })
  const eventId = await writeOutbox(supabase, event)

  return { version_number: form.current_version, event_id: eventId }
}

// -----------------------------------------------------------
// SUBMISSIONS
// -----------------------------------------------------------

export async function startOrGetSubmission(
  supabase: SupabaseClient,
  actorId: string,
  input: {
    form_id: string
    parent_entity_type?: string
    parent_entity_id?: string
  }
) {
  const { data: form } = await supabase.from('operations_forms').select('*').eq('id', input.form_id).maybeSingle()
  if (!form) throw new NotFoundError('Form', input.form_id)
  if (form.status !== 'PUBLISHED' && form.status !== 'DRAFT') {
    throw new StateConflictError(`Form is ${form.status}`)
  }

  const versionNumber = form.published_version || form.current_version
  const { data: version } = await supabase
    .from('operations_form_versions')
    .select('id')
    .eq('form_id', form.id)
    .eq('version_number', versionNumber)
    .maybeSingle()
  if (!version) throw new NotFoundError('FormVersion', String(versionNumber))

  // Reuse an existing DRAFT submission for this user + form
  const { data: existing } = await supabase
    .from('operations_form_submissions')
    .select('*')
    .eq('form_id', form.id)
    .eq('identity_id', actorId)
    .eq('status', 'DRAFT')
    .maybeSingle()
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('operations_form_submissions')
    .insert({
      form_id: form.id,
      form_version_id: version.id,
      identity_id: actorId,
      status: 'DRAFT',
      parent_entity_type: input.parent_entity_type || null,
      parent_entity_id: input.parent_entity_id || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return created
}

export async function saveAnswers(
  supabase: SupabaseClient,
  actorId: string,
  submissionId: string,
  answers: AnswerInput[]
) {
  const { data: sub } = await supabase
    .from('operations_form_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle()
  if (!sub) throw new NotFoundError('Submission', submissionId)
  if (sub.identity_id !== actorId) throw new ForbiddenError('Not your submission')
  if (sub.status !== 'DRAFT') throw new StateConflictError(`Submission is ${sub.status}`)

  for (const a of answers) {
    await supabase.from('operations_form_answers').upsert(
      {
        submission_id: submissionId,
        question_key: a.question_key,
        question_label: a.question_label ?? null,
        question_type: a.question_type ?? null,
        value_text: a.value_text ?? null,
        value_number: a.value_number ?? null,
        value_boolean: a.value_boolean ?? null,
        value_json: a.value_json ?? null,
        file_id: a.file_id ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'submission_id,question_key' }
    )
  }

  return { saved: answers.length }
}

export async function submitSubmission(
  supabase: SupabaseClient,
  actorId: string,
  submissionId: string,
  requestId?: string
) {
  const { data: sub } = await supabase
    .from('operations_form_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle()
  if (!sub) throw new NotFoundError('Submission', submissionId)
  if (sub.identity_id !== actorId) throw new ForbiddenError('Not your submission')
  if (sub.status !== 'DRAFT') throw new StateConflictError(`Submission is ${sub.status}`)

  // Load frozen schema
  const { data: version } = await supabase
    .from('operations_form_versions')
    .select('id, schema_snapshot, version_number')
    .eq('id', sub.form_version_id)
    .maybeSingle()
  if (!version) throw new NotFoundError('FormVersion', sub.form_version_id)

  const snap = version.schema_snapshot as any
  const questions: QuestionDef[] = (snap?.questions || []).map((q: any) => ({
    key: q.key, label: q.label, type: q.type, required: q.required,
    validation_rules: q.validation_rules, options: q.options,
  }))
  const rules = (snap?.rules || []).map((r: any) => ({
    rule_type: r.rule_type,
    target_question_key: r.action?.target_question_key,
    condition: r.condition,
  }))

  const { data: answerRows } = await supabase
    .from('operations_form_answers')
    .select('*')
    .eq('submission_id', submissionId)
  const answers: Record<string, AnswerInput> = {}
  for (const a of (answerRows || []) as any[]) answers[a.question_key] = a

  const effective = applyRules(questions, rules, answers)
  const errors: Array<{ field: string; message: string }> = []
  for (const q of questions) {
    const eff = effective[q.key]
    if (!eff?.visible) continue
    const err = validateAnswer({ ...q, required: eff.required }, answers[q.key])
    if (err) errors.push({ field: q.key, message: err })
  }
  if (errors.length > 0) throw new ValidationError(errors)

  await supabase
    .from('operations_form_submissions')
    .update({ status: 'SUBMITTED', submitted_at: new Date().toISOString() })
    .eq('id', submissionId)

  await writeAudit(supabase, {
    actorId,
    action: 'operations.form_submission.submitted',
    entityType: 'operations_form_submission',
    entityId: submissionId,
    requestId,
    metadata: { form_id: sub.form_id, version_number: version.version_number },
  })

  const event = createKernelEvent({
    eventType: 'operations.form.submitted',
    aggregateType: 'operations_form_submission',
    aggregateId: submissionId,
    actorId,
    payload: {
      form_id: sub.form_id,
      submission_id: submissionId,
      version_number: version.version_number,
      parent_entity_type: sub.parent_entity_type,
      parent_entity_id: sub.parent_entity_id,
    },
  })
  const eventId = await writeOutbox(supabase, event)

  return { submission_id: submissionId, event_id: eventId }
}

export async function withdrawSubmission(
  supabase: SupabaseClient,
  actorId: string,
  submissionId: string,
  requestId?: string
) {
  const { data: sub } = await supabase
    .from('operations_form_submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle()
  if (!sub) throw new NotFoundError('Submission', submissionId)
  if (sub.identity_id !== actorId) throw new ForbiddenError('Not your submission')
  if (!['SUBMITTED', 'UNDER_REVIEW', 'DRAFT'].includes(sub.status)) {
    throw new StateConflictError(`Cannot withdraw when status is ${sub.status}`)
  }

  await supabase
    .from('operations_form_submissions')
    .update({ status: 'WITHDRAWN', withdrawn_at: new Date().toISOString() })
    .eq('id', submissionId)

  await writeAudit(supabase, {
    actorId,
    action: 'operations.form_submission.withdrawn',
    entityType: 'operations_form_submission',
    entityId: submissionId,
    requestId,
  })
}