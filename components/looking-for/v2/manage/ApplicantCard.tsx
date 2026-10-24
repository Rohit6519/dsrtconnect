'use client'

import { CheckCircle, Star, LinkSimple } from '@phosphor-icons/react'

interface Props {
  application: any
  compact?: boolean
  onClick: () => void
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export function ApplicantCard({ application, compact, onClick }: Props) {
  const applicant = application.applicant || application.applicant_snapshot
  const name = applicant?.full_name || applicant?.username || 'Anonymous'
  const message = application.cover_message || application.cover_letter

  const linkCount = [
    application.portfolio_url, application.github_url, application.linkedin_url,
    application.website_url, application.resume_url,
  ].filter(Boolean).length

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left rounded-lg border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900 p-2.5 transition-all"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
            {applicant?.avatar_url ? (
              <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[9px] font-bold text-zinc-500">
                {name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[11.5px] font-semibold text-white truncate flex-1">{name}</span>
          {application.is_starred && (
            <Star size={10} weight="fill" className="text-amber-400 shrink-0" />
          )}
        </div>
        {message && (
          <p className="text-[10.5px] text-zinc-500 line-clamp-2 leading-snug">{message}</p>
        )}
        <div className="mt-1.5 text-[10px] text-zinc-600">
          {timeAgo(application.created_at)} ago
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70 p-4 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
          {applicant?.avatar_url ? (
            <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[13px] font-bold text-zinc-500">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h4 className="text-[13.5px] font-bold text-white group-hover:text-blue-400 truncate transition-colors">
              {name}
            </h4>
            {applicant?.is_verified && (
              <CheckCircle size={10} weight="fill" className="text-blue-400 shrink-0" />
            )}
            {application.is_starred && (
              <Star size={10} weight="fill" className="text-amber-400 shrink-0" />
            )}
          </div>
          {applicant?.tagline && (
            <p className="text-[11.5px] text-zinc-400 truncate">{applicant.tagline}</p>
          )}
        </div>
      </div>

      {message && (
        <p className="text-[12px] text-zinc-400 line-clamp-3 leading-relaxed mb-3">
          {message}
        </p>
      )}

      <div className="flex items-center gap-3 text-[10.5px] text-zinc-500 pt-2 border-t border-zinc-800/60">
        <span>Applied {timeAgo(application.created_at)} ago</span>
        {linkCount > 0 && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="inline-flex items-center gap-1">
              <LinkSimple size={9} weight="bold" />
              {linkCount} link{linkCount !== 1 ? 's' : ''}
            </span>
          </>
        )}
        {application.internal_rating && (
          <>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-amber-400 font-bold">
              {'★'.repeat(application.internal_rating)}
            </span>
          </>
        )}
      </div>
    </button>
  )
}