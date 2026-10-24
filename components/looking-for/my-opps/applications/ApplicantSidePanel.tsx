'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  CheckCircle,
  X,
  Warning,
  ArrowSquareOut,
} from '@phosphor-icons/react'
import {
  buildRequirementEvidence,
  type EvidenceLevel,
} from '@/lib/opportunities/requirement-evidence'
import { ReviewersControl } from './parts/ReviewersControl'
import { TeamInvitationStatus } from '@/components/looking-for/team-invitations/TeamInvitationStatus'
import { StageActionDrawer } from '@/components/looking-for/my-opps/command-center/StageActionDrawer'
import { InterviewAction } from '@/components/looking-for/my-opps/command-center/actions/InterviewAction'
import type { PipelineStage } from '@/lib/applications/types'

const STAGE_ORDER = [
  'submitted',
  'reviewing',
  'screening',
  'interviewing',
  'offered',
  'hired',
  'rejected',
  'withdrawn',
]

const STAGE_LABEL: Record<string, string> = {
  submitted: 'New',
  reviewing: 'Reviewing',
  screening: 'Shortlisted',
  interviewing: 'Interview',
  offered: 'Offer',
  hired: 'Selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
}

const LEVEL_STYLE: Record<EvidenceLevel, string> = {
  strong: 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-300',
  partial: 'border-amber-500/25 bg-amber-500/[0.06] text-amber-300',
  missing: 'border-zinc-800 bg-zinc-950/60 text-zinc-500',
}

export function ApplicantSidePanel({
  appId,
  onClose,
  onChanged,
}: {
  appId: string | null
  onClose: () => void
  onChanged: () => void
}) {
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drawerStage, setDrawerStage] = useState<PipelineStage | null>(null)
  const [showScheduler, setShowScheduler] = useState(false)

  const load = useCallback(async () => {
    if (!appId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/opportunities/applications/${appId}`)
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.error || 'Failed')
      }
      const j = await res.json()
      setData(j)
    } catch (e: any) {
      setError(e?.message || 'Failed')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    load()
  }, [load])

  if (!appId) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-8 text-center min-h-[420px] flex items-center justify-center">
        <div>
          <div className="text-[13px] font-semibold text-white mb-1">
            Select an applicant
          </div>
          <div className="text-[12px] text-zinc-500 max-w-xs mx-auto">
            Click a row to see the full application, requirement evidence, notes
            and reviewer controls.
          </div>
        </div>
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-6 min-h-[420px]">
        <div className="h-6 w-1/2 bg-zinc-900 rounded animate-pulse mb-3" />
        <div className="h-4 w-2/3 bg-zinc-900 rounded animate-pulse mb-6" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-zinc-900 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-6 text-[13px] text-red-300 min-h-[220px] flex items-start gap-2">
        <Warning size={16} className="mt-0.5" />
        <div>{error}</div>
      </div>
    )
  }

  const app = data.application
  const applicant = data.applicant || {}
  const opp = data.opportunity || {}
  const evidence = buildRequirementEvidence({
    required_skills: opp.required_skills,
    preferred_skills: opp.preferred_skills,
    applicant: {
      profile_tags: applicant.profile_tags,
      tagline: applicant.tagline,
      bio: applicant.bio,
    },
    application: {
      highlighted_skills: app.highlighted_skills,
      cover_letter: app.cover_letter,
      cover_message: app.cover_message,
      portfolio_url: app.portfolio_url,
      github_url: app.github_url,
    },
  })

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/80 flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center text-[13px] font-bold text-zinc-500">
          {applicant.avatar_url ? (
            <img
              src={applicant.avatar_url}
              className="w-full h-full object-cover"
              alt=""
            />
          ) : (
            (applicant.full_name || 'A').charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-[15px] font-bold text-white truncate">
              {applicant.full_name || applicant.username || 'Applicant'}
            </div>
            {applicant.is_verified && (
              <span className="w-4 h-4 rounded-full bg-blue-500/15 border border-blue-500/25 text-[8px] font-extrabold text-blue-300 flex items-center justify-center">
                ✓
              </span>
            )}
          </div>
          <div className="text-[12px] text-zinc-500 truncate">
            {applicant.tagline || applicant.location || ''}
          </div>
          {applicant.username && (
            <Link
              href={`/profile/${applicant.username}`}
              className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-zinc-400 hover:text-white"
            >
              View profile
              <ArrowSquareOut size={10} weight="bold" />
            </Link>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center"
          aria-label="Close"
        >
          <X size={14} weight="bold" />
        </button>
      </div>

      {/* Opportunity chip */}
      <div className="px-5 py-3 border-b border-zinc-800/80 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500">
            Opportunity
          </div>
          <div className="text-[12.5px] text-zinc-200 font-semibold truncate">
            {opp.title}
          </div>
          <div className="text-[10.5px] text-zinc-500 font-mono">
            {opp.opportunity_number || ''}
          </div>
        </div>
        <Link
          href={`/looking-for/my-opportunities/${opp.id}`}
          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-300 hover:text-white"
        >
          Open workspace
          <ArrowUpRight size={11} weight="bold" />
        </Link>
      </div>

      {/* Stage selector */}
      <div className="px-5 py-3 border-b border-zinc-800/80">
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Stage
        </div>
        <StageBar
          current={app.pipeline_stage}
          onChange={(stage) => setDrawerStage(stage as PipelineStage)}
        />
      </div>

      {/* Body */}
      <div className="p-5 space-y-5 max-h-[62vh] overflow-y-auto">
        {/* Application message */}
        {(app.cover_message || app.cover_letter) && (
          <Section title="Application">
            {app.cover_message && (
              <>
                <SubTitle>Message</SubTitle>
                <p className="text-[13px] leading-relaxed text-zinc-200 whitespace-pre-wrap">
                  {app.cover_message}
                </p>
              </>
            )}
            {app.cover_letter && (
              <>
                <SubTitle className="mt-3">Relevant experience</SubTitle>
                <p className="text-[13px] leading-relaxed text-zinc-200 whitespace-pre-wrap">
                  {app.cover_letter}
                </p>
              </>
            )}
          </Section>
        )}

        {/* Availability */}
        {(app.availability || app.expected_hours) && (
          <Section title="Availability">
            <div className="text-[13px] text-zinc-300 space-y-0.5">
              {app.availability && (
                <div>
                  Can start:{' '}
                  <span className="text-white capitalize">
                    {String(app.availability).replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {app.expected_hours && (
                <div>
                  Hours per week:{' '}
                  <span className="text-white">{app.expected_hours} hrs</span>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Links */}
        {(app.portfolio_url ||
          app.github_url ||
          app.linkedin_url ||
          app.website_url ||
          app.resume_url) && (
          <Section title="Links">
            <div className="grid grid-cols-2 gap-2">
              {app.portfolio_url && (
                <LinkPill label="Portfolio" url={app.portfolio_url} />
              )}
              {app.github_url && <LinkPill label="GitHub" url={app.github_url} />}
              {app.linkedin_url && (
                <LinkPill label="LinkedIn" url={app.linkedin_url} />
              )}
              {app.website_url && (
                <LinkPill label="Website" url={app.website_url} />
              )}
              {app.resume_url && <LinkPill label="Resume" url={app.resume_url} />}
            </div>
          </Section>
        )}

        {/* Custom answers */}
        {app.answers && Object.keys(app.answers).length > 0 && (
          <Section title="Question responses">
            <div className="space-y-3">
              {Object.entries(app.answers).map(([k, v]) => (
                <div key={k}>
                  <SubTitle>Q{String(k).replace('q_', '')}</SubTitle>
                  <p className="text-[13px] text-zinc-200 whitespace-pre-wrap">
                    {String(v)}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Requirement Evidence */}
        {evidence.length > 0 && (
          <Section title="Requirement evidence">
            <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800">
              {evidence.map((e, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_100px] items-start gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] text-white font-semibold truncate">
                      {e.requirement}
                    </div>
                    <div className="text-[11.5px] text-zinc-500 mt-0.5">
                      {e.reasons.join(' · ')}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span
                      className={
                        'inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-bold uppercase tracking-wider border ' +
                        LEVEL_STYLE[e.level]
                      }
                    >
                      {e.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10.5px] text-zinc-500">
              Evidence is derived from profile skills, application content and
              highlighted skills. It supports judgment, it does not replace it.
            </p>
          </Section>
        )}

        {/* Team Invitation Status */}
        <TeamInvitationStatus
          applicationId={app.id}
          opportunityId={opp.id}
          applicantName={applicant.full_name || applicant.username || 'Applicant'}
          pipelineStage={app.pipeline_stage}
          onRefresh={load}
        />

        {/* Reviewers */}
        <ReviewersControl
          opportunityId={opp.id}
          applicationId={app.id}
          onChanged={load}
        />

        {/* Internal notes */}
        <Notes appId={app.id} initial={data.notes || []} onAdded={load} />
      </div>

      {drawerStage && (
        <StageActionDrawer
          open={!!drawerStage}
          onClose={() => setDrawerStage(null)}
          onCompleted={() => {
            const wasInterviewing = drawerStage === 'interviewing'
            setDrawerStage(null)
            onChanged()
            load()
            // 🔑 If we just transitioned to interviewing, open the scheduler
            if (wasInterviewing) setShowScheduler(true)
          }}
          targetStage={drawerStage}
          targets={[{
            applicationId: app.id,
            applicantName: applicant.full_name || applicant.username || null,
            currentStage: app.pipeline_stage,
          }]}
          opportunity={{
            id: opp.id,
            title: opp.title,
            slug: opp.slug,
            poster_name: null,
            organization_name: null,
          }}
        />
      )}

      {showScheduler && (
        <InterviewAction
          open
          onClose={() => setShowScheduler(false)}
          onCompleted={() => {
            setShowScheduler(false)
            onChanged()
            load()
          }}
          applicationId={app.id}
          opportunityId={opp.id}
          applicantName={applicant.full_name || applicant.username}
        />
      )}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">
        {title}
      </div>
      {children}
    </section>
  )
}

function SubTitle({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={
        'text-[11px] font-semibold text-zinc-400 mb-1 ' + (className || '')
      }
    >
      {children}
    </div>
  )
}

function LinkPill({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-between gap-2 h-9 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 text-[12px] font-semibold text-zinc-300 hover:text-white bg-zinc-950/50"
    >
      <span>{label}</span>
      <ArrowSquareOut size={10} weight="bold" />
    </a>
  )
}

function StageBar({
  current,
  onChange,
}: {
  current: string
  onChange: (stage: string) => Promise<void> | void
}) {
  const progress = STAGE_ORDER.filter(
    (s) => !['rejected', 'withdrawn'].includes(s)
  )
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {progress.map((s) => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={
            'inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11.5px] font-semibold border transition-colors ' +
            (current === s
              ? 'border-white/20 bg-white/[0.08] text-white'
              : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
          }
        >
          {current === s && (
            <CheckCircle size={11} weight="fill" className="text-emerald-300" />
          )}
          {STAGE_LABEL[s]}
        </button>
      ))}
      <span className="mx-1 text-zinc-700">·</span>
      <button
        onClick={() => onChange('rejected')}
        className={
          'inline-flex items-center h-7 px-2.5 rounded-md text-[11.5px] font-semibold border transition-colors ' +
          (current === 'rejected'
            ? 'border-red-500/30 bg-red-500/10 text-red-300'
            : 'border-zinc-800 text-zinc-400 hover:text-red-300 hover:border-red-500/30')
        }
      >
        Reject
      </button>
    </div>
  )
}

function Notes({
  appId,
  initial,
  onAdded,
}: {
  appId: string
  initial: any[]
  onAdded: () => void
}) {
  const [notes, setNotes] = useState<any[]>(initial)
  const [val, setVal] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => setNotes(initial), [initial])

  const submit = async () => {
    const text = val.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/opportunities/applications/${appId}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        }
      )
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed')
      setVal('')
      setNotes((prev) => [j.note, ...prev])
      onAdded()
    } catch (e: any) {
      alert(e?.message || 'Failed to add note')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Internal notes (private)">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60">
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={3}
          placeholder="Add a private note visible only to your team…"
          className="w-full px-3 py-2 bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-zinc-800">
          <span className="text-[10.5px] text-zinc-500">
            Applicants never see internal notes.
          </span>
          <button
            onClick={submit}
            disabled={busy || !val.trim()}
            className="h-8 px-3 rounded-lg bg-white text-black text-[12px] font-bold disabled:opacity-60"
          >
            {busy ? 'Adding…' : 'Add note'}
          </button>
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="mt-3 space-y-2">
          {notes.map((n: any) => (
            <li
              key={n.id}
              className="rounded-xl border border-zinc-800/70 bg-zinc-950/40 p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[10.5px] font-bold text-zinc-400">
                  {n.author?.avatar_url ? (
                    <img
                      src={n.author.avatar_url}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    (n.author?.full_name || '?').charAt(0)
                  )}
                </div>
                <span className="text-[12px] font-semibold text-zinc-200 truncate">
                  {n.author?.full_name || n.author?.username || 'Team member'}
                </span>
                <span className="text-[10.5px] text-zinc-500">
                  · {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-[12.5px] text-zinc-300 whitespace-pre-wrap">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}