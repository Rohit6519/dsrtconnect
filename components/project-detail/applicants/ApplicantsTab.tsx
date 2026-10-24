'use client'

import { useEffect, useState, useCallback } from 'react'
import { Users, Certificate, Star, XCircle, Check, Clock, MagnifyingGlass, Funnel } from '@phosphor-icons/react'
import { ApplicationReviewModal } from './ApplicationReviewModal'

const STATUSES = [
  { id: 'all', label: 'All', color: 'text-white/70' },
  { id: 'pending', label: 'Pending', color: 'text-white/80', badge: 'bg-white/[0.1] text-white' },
  { id: 'reviewing', label: 'Reviewing', color: 'text-blue-300', badge: 'bg-blue-500/15 text-blue-300' },
  { id: 'shortlisted', label: 'Shortlisted', color: 'text-yellow-300', badge: 'bg-yellow-500/15 text-yellow-300' },
  { id: 'accepted', label: 'Accepted', color: 'text-emerald-300', badge: 'bg-emerald-500/15 text-emerald-300' },
  { id: 'rejected', label: 'Rejected', color: 'text-red-300', badge: 'bg-red-500/15 text-red-300' },
]

interface Props {
  slug: string
  isOwner: boolean
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 60) return diff + 'm ago'
  const h = Math.floor(diff / 60)
  if (h < 24) return h + 'h ago'
  const days = Math.floor(h / 24)
  if (days < 30) return days + 'd ago'
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function ApplicantsTab({ slug, isOwner }: Props) {
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [roles, setRoles] = useState<any[]>([])
  const [selectedRole, setSelectedRole] = useState('all')
  const [query, setQuery] = useState('')
  const [reviewing, setReviewing] = useState<any | null>(null)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      const url = '/api/projects/' + slug + '/applicants' + (filter !== 'all' ? '?status=' + filter : '')
      const res = await fetch(url)
      const json = await res.json()
      setApps(json.applications || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [slug, filter])

  useEffect(() => { fetchApps() }, [fetchApps])

  useEffect(() => {
    fetch('/api/projects/' + slug + '/roles')
      .then(r => r.json())
      .then(j => setRoles(j.roles || []))
      .catch(() => {})
  }, [slug])

  const changeStatus = async (newStatus: string, notes: string) => {
    if (!reviewing) return
    try {
      const res = await fetch('/api/projects/' + slug + '/applicants/' + reviewing.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reviewer_notes: notes }),
      })
      if (!res.ok) throw new Error()
      await fetchApps()
      setReviewing(null)
    } catch { alert('Failed to update status') }
  }

  const filtered = apps.filter((a: any) => {
    if (selectedRole !== 'all' && a.role_id !== selectedRole) return false
    if (query.length > 1) {
      const q = query.toLowerCase()
      const name = (a.applicant?.full_name || '').toLowerCase()
      const role = (a.role?.title || '').toLowerCase()
      if (!name.includes(q) && !role.includes(q)) return false
    }
    return true
  })

  // Status counts (only across current filter of pending vs all)
  const countByStatus: Record<string, number> = {}
  for (const a of apps) {
    countByStatus[a.status] = (countByStatus[a.status] || 0) + 1
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[20px] font-bold text-white">Applicants</h2>
          <p className="text-[13px] text-white/55 mt-0.5">Review and respond to people who want to join your project</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.06] overflow-x-auto scrollbar-hide">
        {STATUSES.map(s => (
          <button
            key={s.id}
            onClick={() => setFilter(s.id)}
            className={
              'flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ' +
              (filter === s.id
                ? 'text-white border-white'
                : 'text-white/45 border-transparent hover:text-white/80')
            }
          >
            {s.label}
            {countByStatus[s.id] > 0 && (
              <span className={
                'text-[10px] font-bold px-1.5 py-0.5 rounded ' +
                (filter === s.id ? 'bg-white/[0.12] text-white' : 'bg-white/[0.06] text-white/60')
              }>
                {countByStatus[s.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-[320px]">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" size={13} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applicants..."
            className="w-full pl-8 h-9 bg-white/[0.04] border border-white/[0.08] rounded-md text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/25"
          />
        </div>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="h-9 bg-white/[0.04] border border-white/[0.08] rounded-md px-3 text-[13px] text-white outline-none focus:border-white/25 cursor-pointer"
        >
          <option value="all" className="bg-[#12121a]">All roles</option>
          {roles.map((r: any) => (
            <option key={r.id} value={r.id} className="bg-[#12121a]">{r.title}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-10 text-center text-[13px] text-white/45">Loading applications...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-12 text-center">
          <Users size={32} className="mx-auto mb-3 text-white/25" />
          <p className="text-[14px] text-white/50">No {filter !== 'all' ? filter : ''} applications</p>
          <p className="text-[12px] text-white/35 mt-1">
            {filter === 'pending'
              ? 'When someone applies to your open roles, they will appear here.'
              : 'Try a different filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any) => (
            <ApplicantRow
              key={a.id}
              app={a}
              onClick={() => setReviewing(a)}
            />
          ))}
        </div>
      )}

      {reviewing && (
        <ApplicationReviewModal
          slug={slug}
          application={reviewing}
          onClose={() => setReviewing(null)}
          onStatusChange={changeStatus}
        />
      )}
    </div>
  )
}

function ApplicantRow({ app, onClick }: { app: any; onClick: () => void }) {
  const applicant = app.applicant || {}
  const role = app.role || {}
  const statusCfg = STATUSES.find(s => s.id === app.status)

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-4 p-4 bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15] rounded-xl transition-colors text-left group"
    >
      <div className="w-11 h-11 rounded-full bg-white/[0.06] overflow-hidden flex-shrink-0 flex items-center justify-center border border-white/[0.08]">
        {applicant.avatar_url ? (
          <img src={applicant.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[14px] font-semibold text-white/80">{(applicant.full_name || '?').charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-[14px] font-semibold text-white truncate">{applicant.full_name || 'Unknown'}</p>
          {applicant.is_verified && <Certificate size={11} weight="fill" className="text-blue-400" />}
        </div>
        <p className="text-[12px] text-white/60 truncate">{applicant.tagline || applicant.bio || 'DSRT builder'}</p>
        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-white/50">
          <span>Applied for <strong className="text-white/75">{role.title || 'a role'}</strong></span>
          <span>·</span>
          <span>{timeAgo(app.created_at)}</span>
        </div>
      </div>
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <span className={
          'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ' +
          (statusCfg?.badge || 'bg-white/[0.06] text-white/70')
        }>
          {statusCfg?.label || app.status}
        </span>
        <span className="text-[11px] text-white/50 group-hover:text-white/80">Review →</span>
      </div>
    </button>
  )
}
