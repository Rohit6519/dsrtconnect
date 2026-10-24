'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Check, X, Clock, Eye, CaretDown } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface Props { slug: string }

export function VentureApplicants({ slug }: Props) {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/ventures/' + slug + '/applicants')
      .then(r => r.json())
      .then(d => { setApplications(d.applications || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  const updateStatus = async (id: string, status: string, notes?: string) => {
    try {
      const res = await fetch('/api/ventures/' + slug + '/applicants?id=' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reviewer_notes: notes }),
      })
      if (!res.ok) throw new Error()
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status, reviewer_notes: notes } : a))
      toast.success('Application ' + status)
    } catch { toast.error('Failed to update') }
  }

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)
  const pending = applications.filter(a => a.status === 'pending').length

  return (
    <div>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h2 className="text-[20px] font-bold text-white">Applicants</h2>
          <p className="text-[13px] text-white/50 mt-0.5">
            {applications.length} total · {pending} pending review
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-white/[0.06] mb-4">
        {['all', 'pending', 'accepted', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={'px-3 py-2.5 text-[12.5px] font-semibold whitespace-nowrap border-b-2 capitalize transition-colors ' +
              (filter === f ? 'text-white border-white' : 'text-white/45 border-transparent hover:text-white/80')}>
            {f} {f === 'pending' && pending > 0 ? '(' + pending + ')' : ''}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-16 text-center">
          <Briefcase size={26} className="text-white/40 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-white">No {filter !== 'all' ? filter + ' ' : ''}applications</p>
          <p className="text-[12.5px] text-white/45 mt-1">
            {filter === 'all' ? 'Applications will appear here when builders apply to your open roles.' : 'No applications with this status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(app => (
            <ApplicationCard key={app.id} app={app} onUpdate={updateStatus} />
          ))}
        </div>
      )}
    </div>
  )
}

function ApplicationCard({ app, onUpdate }: { app: any; onUpdate: (id: string, status: string, notes?: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const user = app.users
  const role = app.venture_looking_for

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/20',
    accepted: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl overflow-hidden transition-colors">
      <div className="p-4 flex items-start gap-3">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-[13px] font-bold text-white/70 flex-shrink-0">{user?.full_name?.charAt(0)}</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-[14px] font-bold text-white">{user?.full_name}</h4>
              <p className="text-[11.5px] text-white/50 mt-0.5">
                Applied for <span className="text-white/80 font-semibold">{role?.title}</span>
                {' · '}{formatDistanceToNow(new Date(app.created_at), { addSuffix: true })}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ' + (statusColors[app.status] || statusColors.pending)}>
                {app.status}
              </span>
              <button onClick={() => setExpanded(!expanded)} className="w-7 h-7 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center">
                <CaretDown size={12} weight="bold" className={'transition-transform ' + (expanded ? 'rotate-180' : '')} />
              </button>
            </div>
          </div>

          {user?.tagline && <p className="text-[12px] text-white/60 mt-1">{user.tagline}</p>}

          {/* Skills */}
          {user?.brings && user.brings.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {user.brings.slice(0, 5).map((s: string) => (
                <span key={s} className="text-[10px] font-medium text-white/70 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3 ml-[52px]">
          {app.cover_letter && (
            <div>
              <p className="text-[10.5px] font-bold text-white/50 uppercase tracking-wider mb-1">Cover Letter</p>
              <p className="text-[12.5px] text-white/80 leading-relaxed whitespace-pre-wrap">{app.cover_letter}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-[11.5px]">
            {app.portfolio_url && <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline">Portfolio</a>}
            {app.github_url && <a href={app.github_url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline">GitHub</a>}
            {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline">LinkedIn</a>}
            {app.resume_url && <a href={app.resume_url} target="_blank" rel="noopener noreferrer" className="text-white/70 hover:text-white underline">Resume</a>}
          </div>

          {app.availability && <p className="text-[11.5px] text-white/60">Availability: {app.availability}</p>}
          {app.expected_hours && <p className="text-[11.5px] text-white/60">Expected hours: {app.expected_hours} hrs/week</p>}

          {user?.username && (
            <a href={'/profile/' + user.username} target="_blank" className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-white/70 hover:text-white border border-white/[0.08] hover:border-white/[0.15] px-2.5 h-7 rounded-md transition-colors">
              <Eye size={11} /> View Profile
            </a>
          )}

          {app.status === 'pending' && (
            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
              <button onClick={() => onUpdate(app.id, 'accepted')}
                className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 h-8 rounded-lg transition-colors">
                <Check size={12} weight="bold" /> Accept
              </button>
              <button onClick={() => onUpdate(app.id, 'rejected')}
                className="flex items-center gap-1.5 text-[11.5px] font-semibold text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 h-8 rounded-lg transition-colors">
                <X size={12} weight="bold" /> Reject
              </button>
            </div>
          )}

          {app.reviewer_notes && (
            <div className="bg-white/[0.03] border border-white/[0.05] rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-0.5">Reviewer Notes</p>
              <p className="text-[12px] text-white/75">{app.reviewer_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}