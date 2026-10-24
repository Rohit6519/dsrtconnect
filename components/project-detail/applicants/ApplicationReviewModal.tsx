'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, Certificate, Envelope, Globe, GithubLogo, LinkedinLogo, FileText, Clock, Calendar, Check, XCircle, Star, ClipboardText } from '@phosphor-icons/react'

const STATUSES = [
  { id: 'pending', label: 'Pending', color: 'bg-white/[0.08] text-white/70 border-white/[0.15]' },
  { id: 'reviewing', label: 'Reviewing', color: 'bg-blue-500/12 text-blue-300 border-blue-500/25' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'bg-yellow-500/12 text-yellow-300 border-yellow-500/25' },
  { id: 'accepted', label: 'Accepted', color: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500/12 text-red-300 border-red-500/25' },
]

interface Props {
  slug: string
  application: any
  onClose: () => void
  onStatusChange: (newStatus: string, notes: string) => Promise<void>
}

export function ApplicationReviewModal({ slug, application, onClose, onStatusChange }: Props) {
  const [status, setStatus] = useState(application.status)
  const [notes, setNotes] = useState(application.reviewer_notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const applicant = application.applicant || {}
  const role = application.role || {}
  const answers = application.answers || {}
  const answerEntries = Object.entries(answers)

  const submit = async (newStatus: string) => {
    setSaving(true)
    try {
      await onStatusChange(newStatus, notes)
      setStatus(newStatus)
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
      <div className="bg-[#0f0f18] border border-white/[0.08] w-full max-w-[720px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[92vh]">

        {/* Header — applicant */}
        <div className="p-6 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center border-2 border-white/[0.1]">
              {applicant.avatar_url ? (
                <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[18px] font-bold text-white/80">{(applicant.full_name || '?').charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-[18px] font-bold text-white truncate">{applicant.full_name || 'Unknown'}</h2>
                {applicant.is_verified && <Certificate size={14} weight="fill" className="text-blue-400" />}
              </div>
              {applicant.tagline && (
                <p className="text-[13px] text-white/60 leading-snug mt-0.5">{applicant.tagline}</p>
              )}
              <div className="flex items-center gap-2.5 mt-2">
                <Link
                  href={'/profile/' + (applicant.username || applicant.id)}
                  className="text-[12px] font-semibold text-white/85 hover:text-white underline underline-offset-2"
                >
                  View profile
                </Link>
                <span className={
                  'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ' +
                  (STATUSES.find(s => s.id === status)?.color || '')
                }>
                  {STATUSES.find(s => s.id === status)?.label || status}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white p-1">
              <X size={20} />
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.05] text-[12px] text-white/55 flex items-center gap-3 flex-wrap">
            <span>Applied for <strong className="text-white/85">{role.title || 'a role'}</strong></span>
            <span>·</span>
            <span>{new Date(application.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            {application.reviewed_at && (
              <>
                <span>·</span>
                <span>Reviewed {new Date(application.reviewed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Cover letter */}
          {application.cover_letter && (
            <Section title="Cover letter" icon={<ClipboardText size={12} />}>
              <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">{application.cover_letter}</p>
            </Section>
          )}

          {/* Custom question answers */}
          {answerEntries.length > 0 && (
            <Section title="Application questions">
              <div className="space-y-3">
                {answerEntries.map(([q, a]: any) => (
                  <div key={q}>
                    <p className="text-[13px] font-semibold text-white/85 mb-1">{q}</p>
                    <p className="text-[13px] text-white/70 leading-relaxed whitespace-pre-wrap bg-white/[0.03] border border-white/[0.06] rounded-md p-3">{a}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Links */}
          {(application.portfolio_url || application.github_url || application.linkedin_url || application.resume_url) && (
            <Section title="Links & attachments">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {application.portfolio_url && <LinkRow icon={<Globe size={13} />} label="Portfolio" url={application.portfolio_url} />}
                {application.github_url && <LinkRow icon={<GithubLogo size={13} />} label="GitHub" url={application.github_url} />}
                {application.linkedin_url && <LinkRow icon={<LinkedinLogo size={13} />} label="LinkedIn" url={application.linkedin_url} />}
                {application.resume_url && <LinkRow icon={<FileText size={13} />} label="Resume" url={application.resume_url} />}
              </div>
            </Section>
          )}

          {/* Availability */}
          {(application.availability || application.expected_hours || application.start_date) && (
            <Section title="Availability" icon={<Clock size={12} />}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {application.availability && (
                  <MetaRow label="Availability">{application.availability}</MetaRow>
                )}
                {application.expected_hours && (
                  <MetaRow label="Hours/week">{application.expected_hours}h</MetaRow>
                )}
                {application.start_date && (
                  <MetaRow label="Can start">{new Date(application.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</MetaRow>
                )}
              </div>
            </Section>
          )}

          {/* Reviewer notes */}
          <Section title="Reviewer notes (private)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 5000))}
              rows={4}
              placeholder="Only visible to project owner & permitted reviewers"
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-md p-3 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25 resize-y"
            />
          </Section>
        </div>

        {/* Footer — action bar */}
        <div className="border-t border-white/[0.06] px-6 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => submit('reviewing')}
              disabled={saving || status === 'reviewing'}
              className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold text-blue-300 bg-blue-500/12 border border-blue-500/25 hover:bg-blue-500/20 rounded-md disabled:opacity-40"
            >
              Mark reviewing
            </button>
            <button
              onClick={() => submit('shortlisted')}
              disabled={saving || status === 'shortlisted'}
              className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold text-yellow-300 bg-yellow-500/12 border border-yellow-500/25 hover:bg-yellow-500/20 rounded-md disabled:opacity-40"
            >
              <Star size={11} weight="fill" /> Shortlist
            </button>
            <div className="flex-1" />
            <button
              onClick={() => submit('rejected')}
              disabled={saving || status === 'rejected'}
              className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold text-red-300 bg-red-500/12 border border-red-500/25 hover:bg-red-500/20 rounded-md disabled:opacity-40"
            >
              <XCircle size={11} weight="fill" /> Reject
            </button>
            <button
              onClick={() => submit('accepted')}
              disabled={saving || status === 'accepted'}
              className="flex items-center gap-1.5 px-4 h-9 text-[13px] font-bold bg-emerald-500 text-white hover:bg-emerald-400 rounded-md disabled:opacity-40"
            >
              <Check size={13} weight="bold" /> Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1">
        {icon} {title}
      </h3>
      {children}
    </div>
  )
}

function LinkRow({ icon, label, url }: { icon: React.ReactNode; label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 h-9 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] rounded-md transition-colors"
    >
      <span className="text-white/50">{icon}</span>
      <span className="text-[12px] font-semibold text-white/85 min-w-[70px]">{label}</span>
      <span className="text-[11px] text-white/50 truncate flex-1">{url}</span>
    </a>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold mb-0.5">{label}</p>
      <p className="text-[13px] text-white/85">{children}</p>
    </div>
  )
}
