'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  X, CheckCircle, Star, ArrowUpRight, ChatCircle,
  Handshake, XCircle, PauseCircle, User,
} from '@phosphor-icons/react'

interface Props {
  application: any
  opportunityId: string
  onClose: () => void
  onUpdate: (appId: string, patch: any) => void
}

const STAGE_ACTIONS = [
  { key: 'shortlisted', label: 'Shortlist', Icon: CheckCircle, color: 'cyan' },
  { key: 'interview', label: 'Move to Interview', Icon: ChatCircle, color: 'purple' },
  { key: 'accepted', label: 'Accept', Icon: Handshake, color: 'emerald' },
  { key: 'declined', label: 'Decline', Icon: XCircle, color: 'red' },
  { key: 'under-review', label: 'Under Review', Icon: PauseCircle, color: 'blue' },
]

const COLOR_CLASSES: Record<string, string> = {
  cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20',
  purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20',
  red: 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
}

export function ApplicantDetailModal({ application, opportunityId, onClose, onUpdate }: Props) {
  const [notes, setNotes] = useState(application.internal_notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Mark as viewed if just opened
  useEffect(() => {
    if (application.pipeline_stage === 'submitted') {
      onUpdate(application.id, { pipeline_stage: 'viewed', first_viewed_at: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const applicant = application.applicant || application.applicant_snapshot
  const name = applicant?.full_name || applicant?.username || 'Anonymous'

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await fetch(`/api/opportunities/${opportunityId}/applicants/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internal_notes: notes }),
      })
    } finally {
      setSavingNotes(false)
    }
  }

  const toggleStar = () => {
    onUpdate(application.id, { is_starred: !application.is_starred })
  }

  const setRating = (rating: number) => {
    onUpdate(application.id, { internal_rating: rating === application.internal_rating ? null : rating })
  }

  const moveToStage = (stage: string) => {
    onUpdate(application.id, { pipeline_stage: stage })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="relative w-full max-w-4xl max-h-[92vh] rounded-2xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden flex flex-col shadow-[0_20px_80px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-zinc-800 shrink-0">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <div className="w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
              {applicant?.avatar_url ? (
                <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={20} className="text-zinc-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h2 className="text-[18px] font-bold text-white truncate">{name}</h2>
                {applicant?.is_verified && (
                  <CheckCircle size={13} weight="fill" className="text-blue-400 shrink-0" />
                )}
              </div>
              {applicant?.tagline && (
                <p className="text-[13px] text-zinc-400 truncate">{applicant.tagline}</p>
              )}
              {applicant?.location && (
                <p className="text-[11.5px] text-zinc-500 mt-1">{applicant.location}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {applicant?.username && (
                  <Link
                    href={`/profile/${applicant.username}`}
                    className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    View full profile
                    <ArrowUpRight size={9} weight="bold" />
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={toggleStar}
              className={
                'w-8 h-8 rounded-md border flex items-center justify-center transition-colors ' +
                (application.is_starred
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-zinc-800 hover:border-zinc-700 text-zinc-500 hover:text-amber-400')
              }
            >
              <Star size={12} weight={application.is_starred ? 'fill' : 'regular'} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 p-6">
            {/* Main: Application content */}
            <div className="space-y-6 min-w-0">
              {application.cover_message && (
                <Section title="Message">
                  <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {application.cover_message}
                  </p>
                </Section>
              )}

              {application.cover_letter && (
                <Section title="Relevant experience">
                  <p className="text-[14px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {application.cover_letter}
                  </p>
                </Section>
              )}

              {(application.availability || application.expected_hours) && (
                <Section title="Availability">
                  <div className="space-y-1 text-[13px] text-zinc-300">
                    {application.availability && (
                      <div>Can start: <span className="text-white capitalize font-medium">{application.availability.replace(/_/g, ' ')}</span></div>
                    )}
                    {application.expected_hours && (
                      <div>Hours per week: <span className="text-white font-medium">{application.expected_hours} hrs</span></div>
                    )}
                  </div>
                </Section>
              )}

              {application.answers && Object.keys(application.answers).length > 0 && (
                <Section title="Question responses">
                  <div className="space-y-4">
                    {Object.entries(application.answers).map(([k, v]) => (
                      <div key={k}>
                        <p className="text-[12px] font-semibold text-zinc-400 mb-1">Question {k.replace('q_', '')}</p>
                        <p className="text-[13.5px] text-zinc-200 leading-relaxed whitespace-pre-wrap">{String(v)}</p>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {(application.portfolio_url || application.github_url || application.linkedin_url ||
                application.website_url || application.resume_url) && (
                <Section title="Links">
                  <div className="grid grid-cols-2 gap-2">
                    {application.portfolio_url && <LinkPill label="Portfolio" url={application.portfolio_url} />}
                    {application.github_url && <LinkPill label="GitHub" url={application.github_url} />}
                    {application.linkedin_url && <LinkPill label="LinkedIn" url={application.linkedin_url} />}
                    {application.website_url && <LinkPill label="Website" url={application.website_url} />}
                    {application.resume_url && <LinkPill label="Resume" url={application.resume_url} />}
                  </div>
                </Section>
              )}
            </div>

            {/* Sidebar: Actions */}
            <div className="space-y-4">
              {/* Stage actions */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-3">
                  Move to stage
                </h4>
                <div className="space-y-1.5">
                  {STAGE_ACTIONS.map(a => {
                    const isCurrent = application.pipeline_stage === a.key
                    return (
                      <button
                        key={a.key}
                        onClick={() => moveToStage(a.key)}
                        disabled={isCurrent}
                        className={
                          'w-full flex items-center gap-2 h-9 px-3 rounded-md border text-[12px] font-medium transition-colors ' +
                          (isCurrent
                            ? COLOR_CLASSES[a.color] + ' cursor-default'
                            : 'border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white')
                        }
                      >
                        <a.Icon size={12} weight={isCurrent ? 'fill' : 'regular'} />
                        {a.label}
                        {isCurrent && <span className="ml-auto text-[9px] uppercase tracking-wider">Current</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Rating */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Your rating
                </h4>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className="w-7 h-7 flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Star
                        size={16}
                        weight={n <= (application.internal_rating || 0) ? 'fill' : 'regular'}
                        className={n <= (application.internal_rating || 0) ? 'text-amber-400' : 'text-zinc-600 hover:text-amber-400'}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-zinc-500 mt-2">Private — only you can see</p>
              </div>

              {/* Notes */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Private notes
                </h4>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  rows={5}
                  placeholder="Add your notes about this applicant..."
                  className="w-full px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 resize-none leading-relaxed"
                />
                {savingNotes && <p className="text-[10.5px] text-zinc-500 mt-1">Saving...</p>}
              </div>

              {/* Message applicant */}
              {applicant?.username && (
                <Link
                  href={`/inbox?compose=1&to=${applicant.id}&ref=opportunity&refId=${opportunityId}`}
                  className="w-full flex items-center justify-center gap-1.5 h-10 rounded-md bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-colors shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
                >
                  <ChatCircle size={12} weight="fill" />
                  Send message
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2.5">
        {title}
      </h3>
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
      className="inline-flex items-center justify-between gap-2 h-9 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] font-medium text-zinc-300 hover:text-white transition-colors"
    >
      <span>{label}</span>
      <ArrowUpRight size={10} weight="bold" />
    </a>
  )
}