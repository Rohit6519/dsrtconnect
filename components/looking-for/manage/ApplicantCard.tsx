'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Star, CheckCircle, XCircle, Handshake, ChatCircle,
  PauseCircle, Clock, ArrowUpRight, Envelope, CaretDown,
  Note, DotsThree, ArrowsLeftRight,
} from '@phosphor-icons/react'
import type { TeamUpApplication, PipelineStage } from '@/types/teamup'

const STAGE_LIST: Array<{ key: PipelineStage; label: string; Icon: any; color: string }> = [
  { key: 'applied',      label: 'Applied',      Icon: Clock,        color: 'text-zinc-400' },
  { key: 'under_review', label: 'Under review', Icon: PauseCircle,  color: 'text-blue-400' },
  { key: 'shortlisted',  label: 'Shortlisted',  Icon: CheckCircle,  color: 'text-cyan-400' },
  { key: 'interview',    label: 'Interview',    Icon: ChatCircle,   color: 'text-purple-400' },
  { key: 'offer',        label: 'Offer',        Icon: Handshake,    color: 'text-amber-400' },
  { key: 'accepted',     label: 'Accepted',     Icon: CheckCircle,  color: 'text-emerald-400' },
  { key: 'rejected',     label: 'Rejected',     Icon: XCircle,      color: 'text-red-400' },
]

const STAGE_MAP = Object.fromEntries(STAGE_LIST.map(s => [s.key, s]))

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w`
  const months = Math.floor(days / 30)
  return `${months}mo`
}

interface Props {
  application: TeamUpApplication
  selected: boolean
  onToggleSelect: () => void
  onUpdate: (patch: Partial<TeamUpApplication>) => void
}

export function ApplicantCard({ application, selected, onToggleSelect, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [stageMenuOpen, setStageMenuOpen] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(application.internal_notes || '')

  const stageMeta = STAGE_MAP[application.pipeline_stage] || STAGE_MAP.applied
  const applicant = application.applicant
  const scoreBadge = application.score
  const skills = application.skills || []

  const saveNotes = () => {
    onUpdate({ internal_notes: notes })
    setShowNotes(false)
  }

  const setStage = (stage: PipelineStage) => {
    onUpdate({ pipeline_stage: stage })
    setStageMenuOpen(false)
  }

  const toggleStar = () => onUpdate({ is_starred: !application.is_starred })

  return (
    <div className={
      'rounded-xl border transition-colors ' +
      (selected
        ? 'border-blue-500/40 bg-blue-500/[0.03]'
        : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700')
    }>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onToggleSelect}
            className={
              'w-4 h-4 rounded border shrink-0 mt-1 flex items-center justify-center transition-colors ' +
              (selected
                ? 'border-blue-500 bg-blue-500'
                : 'border-zinc-700 hover:border-zinc-500')
            }
          >
            {selected && <CheckCircle size={10} weight="fill" className="text-white" />}
          </button>

          {/* Avatar */}
          {applicant?.avatar_url ? (
            <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
              <Image src={applicant.avatar_url} alt={applicant.full_name} fill className="object-cover" sizes="40px" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-zinc-800 shrink-0 flex items-center justify-center text-[13px] font-medium text-zinc-400">
              {applicant?.full_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {applicant ? (
                <Link
                  href={`/profile/${applicant.username}`}
                  className="text-[14px] font-semibold text-white hover:text-blue-400 transition-colors truncate max-w-[240px]"
                >
                  {applicant.full_name}
                </Link>
              ) : (
                <span className="text-[14px] font-semibold text-zinc-400">Unknown applicant</span>
              )}
              {applicant?.is_verified && (
                <CheckCircle size={11} weight="fill" className="text-blue-400" />
              )}
              <button
                onClick={toggleStar}
                className={
                  'w-6 h-6 rounded flex items-center justify-center transition-colors ' +
                  (application.is_starred
                    ? 'text-amber-400 hover:bg-amber-500/10'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900')
                }
              >
                <Star size={12} weight={application.is_starred ? 'fill' : 'regular'} />
              </button>
              {scoreBadge && scoreBadge.total_score > 0 && (
                <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Strong match
                </span>
              )}
            </div>

            {applicant?.tagline && (
              <div className="text-[12px] text-zinc-500 truncate max-w-md mt-0.5">
                {applicant.tagline}
              </div>
            )}

            <div className="flex items-center gap-3 text-[11.5px] text-zinc-500 mt-1.5">
              <span>Applied {timeAgo(application.created_at)}</span>
              {application.availability && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span className="capitalize">{application.availability.replace('_', ' ')}</span>
                </>
              )}
              {application.expected_hours && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span>{application.expected_hours} hrs/wk</span>
                </>
              )}
              {applicant?.location && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-700" />
                  <span>{applicant.location}</span>
                </>
              )}
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {skills.slice(0, 6).map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    {s}
                  </span>
                ))}
                {skills.length > 6 && (
                  <span className="inline-flex items-center h-5 px-1.5 text-[10.5px] text-zinc-500">
                    +{skills.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stage picker */}
          <div className="shrink-0 relative">
            <button
              onClick={() => setStageMenuOpen(!stageMenuOpen)}
              className={
                'inline-flex items-center gap-1.5 h-7 px-2 rounded text-[11px] font-medium border transition-colors ' +
                (application.pipeline_stage === 'accepted'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : application.pipeline_stage === 'rejected'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : application.pipeline_stage === 'shortlisted' || application.pipeline_stage === 'interview'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600')
              }
            >
              <stageMeta.Icon size={10} weight="fill" />
              {stageMeta.label}
              <CaretDown size={9} weight="bold" />
            </button>
            {stageMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStageMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-20 py-1">
                  {STAGE_LIST.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setStage(s.key)}
                      className={
                        'w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors ' +
                        (application.pipeline_stage === s.key
                          ? 'bg-zinc-900 text-white'
                          : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')
                      }
                    >
                      <s.Icon size={12} weight="regular" className={s.color} />
                      {s.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-7 h-7 rounded-md border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 shrink-0"
          >
            <CaretDown
              size={11}
              weight="bold"
              className={'transition-transform ' + (expanded ? 'rotate-180' : '')}
            />
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-zinc-800/60 space-y-4">
            {application.message && (
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                  Introduction
                </div>
                <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {application.message}
                </p>
              </div>
            )}

            {application.cover_letter && (
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                  Relevant experience
                </div>
                <p className="text-[13px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {application.cover_letter}
                </p>
              </div>
            )}

            {application.answers && Object.keys(application.answers).length > 0 && (
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                  Custom answers
                </div>
                <div className="space-y-2">
                  {Object.entries(application.answers).map(([k, v]) => (
                    <div key={k} className="text-[13px] text-zinc-300 p-3 rounded-lg border border-zinc-800 bg-zinc-950">
                      {String(v)}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            {(application.resume_url || application.portfolio_url || application.github_url || application.linkedin_url) && (
              <div>
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1.5">
                  Links
                </div>
                <div className="flex flex-wrap gap-2">
                  {application.resume_url && <LinkChip label="Resume" href={application.resume_url} />}
                  {application.portfolio_url && <LinkChip label="Portfolio" href={application.portfolio_url} />}
                  {application.github_url && <LinkChip label="GitHub" href={application.github_url} />}
                  {application.linkedin_url && <LinkChip label="LinkedIn" href={application.linkedin_url} />}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Internal notes
                </div>
                {!showNotes && (
                  <button
                    onClick={() => setShowNotes(true)}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200"
                  >
                    <Note size={10} />
                    {application.internal_notes ? 'Edit' : 'Add'}
                  </button>
                )}
              </div>
              {showNotes ? (
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-700 resize-none"
                    placeholder="Private notes only you can see..."
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={saveNotes}
                      className="h-7 px-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11.5px] font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setNotes(application.internal_notes || ''); setShowNotes(false) }}
                      className="h-7 px-2.5 rounded border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[11.5px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : application.internal_notes ? (
                <p className="text-[12.5px] text-zinc-400 leading-relaxed whitespace-pre-wrap p-2.5 rounded-md border border-zinc-800/60 bg-zinc-950/60">
                  {application.internal_notes}
                </p>
              ) : (
                <p className="text-[12px] text-zinc-600 italic">No notes yet.</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              {applicant && (
                <Link
                  href={`/profile/${applicant.username}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] text-zinc-300"
                >
                  <ArrowUpRight size={11} weight="bold" />
                  View profile
                </Link>
              )}
              {applicant && (
                <Link
                  href={`/messages?to=${applicant.id}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12px] text-zinc-300"
                >
                  <Envelope size={11} weight="regular" />
                  Message
                </Link>
              )}
              {application.pipeline_stage !== 'shortlisted' && application.pipeline_stage !== 'accepted' && (
                <button
                  onClick={() => setStage('shortlisted')}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[12px] font-medium hover:bg-blue-500/15"
                >
                  <CheckCircle size={11} weight="fill" />
                  Shortlist
                </button>
              )}
              {application.pipeline_stage !== 'rejected' && (
                <button
                  onClick={() => setStage('rejected')}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-[12px]"
                >
                  <XCircle size={11} weight="regular" />
                  Reject
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function LinkChip({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 h-7 px-2.5 rounded border border-zinc-800 hover:border-zinc-700 text-[11.5px] text-zinc-300 hover:text-white"
    >
      {label}
      <ArrowUpRight size={9} weight="bold" />
    </a>
  )
}
