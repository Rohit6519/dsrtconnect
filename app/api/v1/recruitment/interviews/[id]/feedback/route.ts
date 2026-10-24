// ============================================================
// app/api/v1/recruitment/interviews/[id]/feedback/route.ts
// Submit interview feedback.
// Only interview participants with role interviewer or hiring_manager
// may submit (enforced by DB RLS + this route).
// ============================================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthContext,
  ok,
  fail,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  writeAudit,
  writeOutbox,
  createKernelEvent,
} from '@/lib/kernel'

export const dynamic = 'force-dynamic'

const ALLOWED_RECOMMENDATIONS = [
  'STRONG_HIRE',
  'HIRE',
  'LEAN_HIRE',
  'LEAN_NO_HIRE',
  'NO_HIRE',
  'STRONG_NO_HIRE',
] as const

type Recommendation = (typeof ALLOWED_RECOMMENDATIONS)[number]

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    const { id: interviewId } = await params
    ctx = await requireAuthContext(req)
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))

    // ---- Validate body ----
    const recommendation = body?.recommendation as Recommendation | undefined
    const score = typeof body?.score === 'number' ? body.score : null
    const feedbackBody = typeof body?.body === 'string' ? body.body.trim() : ''

    const errors: Array<{ field: string; message: string }> = []
    if (!recommendation || !ALLOWED_RECOMMENDATIONS.includes(recommendation)) {
      errors.push({
        field: 'recommendation',
        message: `Must be one of: ${ALLOWED_RECOMMENDATIONS.join(', ')}`,
      })
    }
    if (score !== null && (score < 1 || score > 5)) {
      errors.push({ field: 'score', message: 'Score must be between 1 and 5' })
    }
    if (feedbackBody.length > 6000) {
      errors.push({ field: 'body', message: 'Feedback too long (max 6000 chars)' })
    }
    if (errors.length > 0) throw new ValidationError(errors)

    // ---- Load interview (for opportunity_id + status) ----
    const { data: interview } = await supabase
      .from('interviews')
      .select('id, opportunity_id, application_id, status')
      .eq('id', interviewId)
      .maybeSingle()

    if (!interview) throw new NotFoundError('Interview', interviewId)

    // ---- Ensure actor is an interviewer / hiring_manager participant ----
    // (DB RLS would block us anyway, but this gives a clean error message)
    const { data: participant } = await supabase
      .from('interview_participants')
      .select('id, role')
      .eq('interview_id', interviewId)
      .eq('user_id', ctx.identityId)
      .maybeSingle()

    if (
      !participant ||
      !['interviewer', 'hiring_manager'].includes(participant.role)
    ) {
      throw new ForbiddenError(
        'Only assigned interviewers or hiring managers can submit feedback'
      )
    }

    // ---- Upsert feedback (one row per reviewer per interview) ----
    const { data: existing } = await supabase
      .from('interview_feedback')
      .select('id')
      .eq('interview_id', interviewId)
      .eq('reviewer_id', ctx.identityId)
      .maybeSingle()

    let feedbackId: string
    if (existing) {
      const { data: updated, error: upErr } = await supabase
        .from('interview_feedback')
        .update({
          recommendation,
          score,
          body: feedbackBody || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('id')
        .single()
      if (upErr) {
        if (upErr.code === '42501') {
          throw new ForbiddenError(
            'Only assigned interviewers or hiring managers can submit feedback'
          )
        }
        throw upErr
      }
      feedbackId = updated.id
    } else {
      const { data: created, error: insErr } = await supabase
        .from('interview_feedback')
        .insert({
          interview_id: interviewId,
          reviewer_id: ctx.identityId,
          recommendation,
          score,
          body: feedbackBody || null,
        })
        .select('id')
        .single()
      if (insErr) {
        if (insErr.code === '42501') {
          throw new ForbiddenError(
            'Only assigned interviewers or hiring managers can submit feedback'
          )
        }
        throw insErr
      }
      feedbackId = created.id
    }

    // ---- Audit ----
    await writeAudit(supabase, {
      actorId: ctx.identityId,
      action: 'recruitment.interview.feedback.submitted',
      entityType: 'interview_feedback',
      entityId: feedbackId,
      requestId: ctx.requestId,
      metadata: {
        interview_id: interviewId,
        opportunity_id: interview.opportunity_id,
        application_id: interview.application_id,
        recommendation,
        score,
      },
    })

    // ---- Outbox event ----
    const event = createKernelEvent({
      eventType: 'recruitment.interview.feedback.submitted',
      aggregateType: 'interview_feedback',
      aggregateId: feedbackId,
      actorId: ctx.identityId,
      payload: {
        feedback_id: feedbackId,
        interview_id: interviewId,
        opportunity_id: interview.opportunity_id,
        application_id: interview.application_id,
        recommendation,
        score,
      },
    })
    const eventId = await writeOutbox(supabase, event)

    return ok(
      {
        feedback_id: feedbackId,
        interview_id: interviewId,
        recommendation,
        score,
      },
      { ctx, eventId, status: 201 }
    )
  } catch (err) {
    return fail(err, ctx)
  }
}