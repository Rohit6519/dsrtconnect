'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  X, CheckCircle, XCircle, Star, ArrowUpRight,
} from '@phosphor-icons/react'
import type { TeamUpApplication, PipelineStage } from '@/types/teamup'

interface Props {
  applications: TeamUpApplication[]
  onClose: () => void
  onUpdate: (id: string, patch: Partial<TeamUpApplication>) => void
}

export function ApplicantCompareModal({ applications, onClose, onUpdate }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Collect all unique skills across applicants
  const allSkills = Array.from(
    new Set(applications.flatMap(a => a.skills || []))
  ).sort()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
      <div
        className="relative w-full max-w-6xl max-h-[90vh] rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-0.5">
              Compare applicants
            </div>
            <h2 className="text-[15px] font-semibold text-white">
              {applications.length} applicants side-by-side
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid" style={{ gridTemplateColumns: `160px repeat(${applications.length}, minmax(220px, 1fr))` }}>
            {/* Header row */}
            <div className="sticky left-0 z-10 bg-[#0a0a0a] border-b border-r border-zinc-800 p-4" />
            {applications.map(a => (
              <div key={a.id} className="border-b border-r border-zinc-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  {a.applicant?.avatar_url ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 shrink-0 relative">
                      <Image src={a.applicant.avatar_url} alt="" fill className="object-cover" sizes="32px" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-[12px] text-zinc-400 shrink-0">
                      {a.applicant?.full_name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {a.applicant && (
                        <Link
                          href={`/profile/${a.applicant.username}`}
                          className="text-[13px] font-semibold text-white hover:text-blue-400 truncate"
                        >
                          {a.applicant.full_name}
                        </Link>
                      )}
                      {a.is_starred && (
                        <Star size={10} weight="fill" className="text-amber-400 shrink-0" />
                      )}
                    </div>
                    {a.applicant?.tagline && (
                      <div className="text-[11px] text-zinc-500 truncate">
                        {a.applicant.tagline}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdate(a.id, { pipeline_stage: 'shortlisted' })}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10.5px] font-medium hover:bg-blue-500/15"
                  >
                    <CheckCircle size={9} weight="fill" />
                    Shortlist
                  </button>
                  <button
                    onClick={() => onUpdate(a.id, { pipeline_stage: 'rejected' })}
                    className="inline-flex items-center gap-1 h-6 px-2 rounded border border-zinc-800 hover:border-red-500/30 text-zinc-500 hover:text-red-400 text-[10.5px]"
                  >
                    <XCircle size={9} />
                  </button>
                </div>
              </div>
            ))}

            {/* Stage */}
            <RowLabel>Current stage</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                <span className="capitalize">{a.pipeline_stage.replace('_', ' ')}</span>
              </RowCell>
            ))}

            {/* Applied */}
            <RowLabel>Applied</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                {new Date(a.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                })}
              </RowCell>
            ))}

            {/* Availability */}
            <RowLabel>Availability</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                {a.availability ? a.availability.replace('_', ' ') : '—'}
              </RowCell>
            ))}

            {/* Hours */}
            <RowLabel>Hours/week</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                {a.expected_hours ? `${a.expected_hours} hrs` : '—'}
              </RowCell>
            ))}

            {/* Location */}
            <RowLabel>Location</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                {a.applicant?.location || '—'}
              </RowCell>
            ))}

            {/* Skills */}
            <RowLabel>Skills match</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                <div className="text-[12px] text-white font-semibold">
                  {(a.skills || []).length} skills
                </div>
              </RowCell>
            ))}

            {/* Individual skill rows */}
            {allSkills.length > 0 && (
              <>
                <RowLabel span>Skills</RowLabel>
                {allSkills.slice(0, 15).map(skill => (
                  <>
                    <RowLabel key={`lbl-${skill}`} sub>{skill}</RowLabel>
                    {applications.map(a => (
                      <RowCell key={`${a.id}-${skill}`}>
                        {(a.skills || []).includes(skill) ? (
                          <CheckCircle size={12} weight="fill" className="text-emerald-400" />
                        ) : (
                          <span className="text-zinc-700">—</span>
                        )}
                      </RowCell>
                    ))}
                  </>
                ))}
              </>
            )}

            {/* Intro */}
            <RowLabel>Introduction</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                <p className="text-[11.5px] text-zinc-400 line-clamp-6 leading-relaxed whitespace-pre-wrap">
                  {a.message || <span className="text-zinc-700 italic">No message</span>}
                </p>
              </RowCell>
            ))}

            {/* Experience */}
            <RowLabel>Experience</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                <p className="text-[11.5px] text-zinc-400 line-clamp-6 leading-relaxed whitespace-pre-wrap">
                  {a.cover_letter || <span className="text-zinc-700 italic">Not provided</span>}
                </p>
              </RowCell>
            ))}

            {/* Links */}
            <RowLabel>Links</RowLabel>
            {applications.map(a => (
              <RowCell key={a.id}>
                <div className="flex flex-wrap gap-1">
                  {a.resume_url && <MiniLink href={a.resume_url}>Resume</MiniLink>}
                  {a.portfolio_url && <MiniLink href={a.portfolio_url}>Portfolio</MiniLink>}
                  {a.github_url && <MiniLink href={a.github_url}>GitHub</MiniLink>}
                  {a.linkedin_url && <MiniLink href={a.linkedin_url}>LinkedIn</MiniLink>}
                  {!a.resume_url && !a.portfolio_url && !a.github_url && !a.linkedin_url && (
                    <span className="text-[11px] text-zinc-700">—</span>
                  )}
                </div>
              </RowCell>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end px-6 py-3 border-t border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] text-zinc-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function RowLabel({ children, span, sub }: { children: React.ReactNode; span?: boolean; sub?: boolean }) {
  return (
    <div className={
      'sticky left-0 z-10 bg-[#0a0a0a] border-b border-r border-zinc-800 px-4 py-2.5 ' +
      (span ? 'col-span-full text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mt-2 pt-3 border-t' : '') +
      (sub ? 'text-[11.5px] text-zinc-400 pl-6' : '') +
      (!span && !sub ? 'text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500' : '')
    }>
      {children}
    </div>
  )
}

function RowCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-r border-zinc-800 px-4 py-2.5 text-[12px] text-zinc-300">
      {children}
    </div>
  )
}

function MiniLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 h-5 px-1.5 rounded border border-zinc-800 hover:border-zinc-700 text-[10.5px] text-zinc-400 hover:text-white"
    >
      {children}
      <ArrowUpRight size={7} weight="bold" />
    </a>
  )
}
