'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleNotch, Warning, PaperPlaneTilt, Info } from '@phosphor-icons/react'
import { DrawerShell } from './parts/DrawerShell'
import { EmailPreviewCard } from './parts/EmailPreviewCard'
import { NextStepPicker } from './parts/NextStepPicker'
import { RecipientsSummary } from './parts/RecipientsSummary'
import { StageBadge } from './parts/StageBadge'
import { useStageAction } from './useStageAction'
import { getStageAction, REJECT_REASONS } from '@/lib/applications/stageActionSpec'
import { subjectForStage, bodyForStage, firstNameOf } from '@/lib/applications/stagePreview'
import type { PipelineStage } from '@/lib/applications/types'

export interface StageActionTarget {
  applicationId: string
  applicantName?: string | null
  currentStage?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onCompleted: () => void

  // Which stage the user is trying to move things to
  targetStage: PipelineStage

  // The applications this action applies to
  targets: StageActionTarget[]

  // The parent opportunity (for template context)
  opportunity: {
    id: string
    title: string
    slug?: string | null
    organization_name?: string | null
    poster_name?: string | null
  }
}

export function StageActionDrawer({ open, onClose, onCompleted, targetStage, targets, opportunity }: Props) {
  const spec = getStageAction(targetStage)
  const { run, busy, error } = useStageAction({ onDone: onCompleted })

  const singleTarget = targets[0]
  const sampleName = singleTarget?.applicantName || null

  // Template preview context (uses the first target for name substitution)
  const ctx = useMemo(() => ({
    opportunity_title: opportunity.title,
    opportunity_slug: opportunity.slug,
    applicant_first_name: firstNameOf(sampleName),
    applicant_full_name: sampleName || 'there',
    sender_name: opportunity.poster_name || undefined,
    organization_name: opportunity.organization_name || undefined,
  }), [opportunity, sampleName])

  // Local form state
  const [notify, setNotify] = useState<boolean>(spec?.defaultNotifyCandidate ?? false)
  const [subject, setSubject] = useState<string>('')
  const [body, setBody] = useState<string>('')
  const [nextStep, setNextStep] = useState<string>(spec?.nextSteps[0]?.key || 'none')
  const [reasonKey, setReasonKey] = useState<string>('')
  const [reasonNote, setReasonNote] = useState<string>('')
  const [confirmText, setConfirmText] = useState<string>('')

  // Reset whenever the drawer opens with a new target stage
  useEffect(() => {
    if (!open || !spec) return
    setNotify(spec.defaultNotifyCandidate)
    setSubject(subjectForStage(targetStage, ctx))
    setBody(bodyForStage(targetStage, ctx))
    setNextStep(spec.nextSteps[0]?.key || 'none')
    setReasonKey('')
    setReasonNote('')
    setConfirmText('')
  }, [open, targetStage, spec, ctx])

  if (!spec) return null

  const isReject = targetStage === 'rejected'
  const isDanger = spec.intent === 'danger'
  const needsConfirm = spec.confirmationRequired
  const confirmPhrase = targets.length > 1 ? `confirm ${targets.length}` : 'confirm'
  const confirmValid = !needsConfirm || confirmText.trim().toLowerCase() === confirmPhrase

  const submit = async () => {
    await run({
      applicationIds: targets.map(t => t.applicationId),
      opportunityId: opportunity.id,
      target: targetStage,
      notifyCandidate: notify,
      editedSubject: notify ? subject : undefined,
      editedBody: notify ? body : undefined,
      nextStep,
      internalReason: isReject ? (reasonKey || undefined) : undefined,
      reasonNote: reasonNote.trim() || undefined,
    })
  }

  return (
    <DrawerShell
      open={open}
      onClose={busy ? () => {} : onClose}
      title={spec.title}
      subtitle={spec.description}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] text-zinc-500">
            {targets.length > 1
              ? `${targets.length} applicants will be affected`
              : 'This applicant will be moved into the workflow'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !confirmValid}
              className={
                'inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[13px] font-bold transition-all disabled:opacity-60 whitespace-nowrap ' +
                (isDanger
                  ? 'bg-red-500 text-white hover:bg-red-400 shadow-[0_2px_16px_rgba(239,68,68,0.25)]'
                  : 'bg-white text-black hover:bg-zinc-200 shadow-[0_2px_16px_rgba(255,255,255,0.15)]')
              }
            >
              {busy ? (
                <CircleNotch size={13} className="animate-spin" />
              ) : (
                <PaperPlaneTilt size={13} weight="bold" />
              )}
              {spec.verb}
            </button>
          </div>
        </div>
      }
    >
      {/* Recipients */}
      <RecipientsSummary count={targets.length} sampleName={sampleName || undefined} />

      {/* Stage transition summary */}
      <div className="mt-5 flex items-center gap-2 text-[12px] text-zinc-400">
        Moving to:
        <StageBadge stage={targetStage} />
      </div>

      {/* Reject reason (internal only) */}
      {isReject && (
        <section className="mt-6">
          <SectionHeader label="Internal rejection reason" hint="Never sent to candidate." />
          <div className="grid grid-cols-2 gap-2">
            {REJECT_REASONS.map(r => {
              const active = reasonKey === r.key
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setReasonKey(r.key)}
                  className={
                    'h-9 px-3 rounded-lg border text-[12.5px] font-semibold transition-colors text-left ' +
                    (active
                      ? 'border-red-500/30 bg-red-500/10 text-red-300'
                      : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 text-zinc-300 hover:text-white')
                  }
                >
                  {r.label}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Free-form internal note */}
      <section className="mt-6">
        <SectionHeader label="Internal note (optional)" hint="Private. Only visible to your team." />
        <textarea
          value={reasonNote}
          onChange={(e) => setReasonNote(e.target.value)}
          rows={3}
          placeholder="Add context for your team about this decision…"
          className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-y leading-relaxed"
        />
      </section>

      {/* Candidate communication */}
      <section className="mt-6">
        <SectionHeader label="Candidate communication" hint="Preview, edit, or skip the message to the applicant." />

        <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2.5 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-zinc-950 accent-white cursor-pointer"
          />
          <div>
            <div className="text-[13px] font-semibold text-white">Notify the candidate</div>
            <div className="text-[11.5px] text-zinc-500 mt-0.5">
              Sends a DSRT Mail message and logs it to the application timeline.
            </div>
          </div>
        </label>

        {notify ? (
          <EmailPreviewCard
            subject={subject}
            body={body}
            onChange={({ subject, body }) => { setSubject(subject); setBody(body) }}
            disabled={busy}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 px-4 py-4 text-[12.5px] text-zinc-500 flex items-start gap-2">
            <Info size={13} className="text-zinc-600 mt-0.5 shrink-0" />
            <div>
              No email will be sent. The stage will change silently. You can still send a manual message later from the applicant panel.
            </div>
          </div>
        )}
      </section>

      {/* Next step */}
      <section className="mt-6">
        <SectionHeader label="Next step" hint="What should happen right after this action?" />
        <NextStepPicker
          value={nextStep}
          onChange={setNextStep}
          options={spec.nextSteps}
        />
      </section>

      {/* Danger confirmation */}
      {needsConfirm && (
        <section className="mt-6 rounded-xl border border-red-500/25 bg-red-500/[0.05] p-4">
          <div className="flex items-start gap-2 mb-2">
            <Warning size={14} weight="fill" className="text-red-400 mt-0.5 shrink-0" />
            <div className="text-[12.5px] text-red-200 font-semibold">
              This action is permanent until reopened.
            </div>
          </div>
          <div className="text-[11.5px] text-red-300/80 mb-3">
            Type <span className="font-mono text-red-200">{confirmPhrase}</span> to confirm.
          </div>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-red-500/30 text-[13px] text-white font-mono focus:outline-none focus:border-red-400"
          />
        </section>
      )}

      {error && (
        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/[0.06] px-3 py-2.5 text-[12.5px] text-red-300 flex items-start gap-2">
          <Warning size={13} weight="fill" className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
    </DrawerShell>
  )
}

function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{label}</div>
      {hint && <div className="text-[11px] text-zinc-500 mt-0.5">{hint}</div>}
    </div>
  )
}