'use client'

import { useEffect, useState } from 'react'
import { X, Briefcase, MapPin, Clock, CurrencyDollar, Users, Sparkle, Check, ListChecks, PencilSimple, Trash } from '@phosphor-icons/react'
import { ApplyToRoleModal } from './ApplyToRoleModal'

const EMPLOYMENT_LABELS: Record<string, string> = {
  'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract',
  internship: 'Internship', volunteer: 'Volunteer',
}
const LOCATION_LABELS: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }
const COMP_LABELS: Record<string, string> = {
  unpaid: 'Unpaid', equity: 'Equity only', stipend: 'Stipend',
  salaried: 'Salaried', hourly: 'Hourly', negotiable: 'Negotiable',
}

interface Props {
  slug: string
  role: any
  isOwner: boolean
  currentUserId: string | null
  onClose: () => void
  onEdit?: (role: any) => void
  onDeleted?: () => void
  onApplied?: () => void
}

export function RoleDetailModal({ slug, role, isOwner, currentUserId, onClose, onEdit, onDeleted, onApplied }: Props) {
  const [applying, setApplying] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!currentUserId || isOwner) { setChecking(false); return }
    // Quick check via applicants endpoint if we're allowed to see, else optimistic
    fetch('/api/projects/' + slug + '/applicants?role_id=' + role.id)
      .then(r => r.ok ? r.json() : { applications: [] })
      .then(j => {
        const applied = (j.applications || []).some((a: any) => a.applicant_id === currentUserId)
        setHasApplied(applied)
      })
      .finally(() => setChecking(false))
  }, [currentUserId, isOwner, role.id, slug])

  const deleteRole = async () => {
    if (!confirm('Delete this role? All applications will be removed.')) return
    try {
      const res = await fetch('/api/projects/' + slug + '/roles/' + role.id, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onDeleted?.()
      onClose()
    } catch { alert('Failed to delete role') }
  }

  const skills = role.key_skills || role.skills_needed || []

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-start md:items-center justify-center p-0 md:p-4 overflow-y-auto">
        <div className="bg-[#0f0f18] border border-white/[0.08] w-full max-w-[640px] md:rounded-2xl overflow-hidden flex flex-col min-h-screen md:min-h-0 md:max-h-[92vh]">

          <div className="p-6 border-b border-white/[0.06] flex-shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-500/12 border border-orange-500/25 flex items-center justify-center flex-shrink-0">
                <Briefcase size={18} weight="fill" className="text-orange-300" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[20px] font-bold text-white leading-tight">{role.title}</h2>
                <p className="text-[12px] font-semibold text-orange-300 uppercase tracking-wider mt-0.5">Open Role</p>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              {role.location_type && (
                <Chip icon={<MapPin size={10} />}>{LOCATION_LABELS[role.location_type] || role.location_type}</Chip>
              )}
              {role.employment_type && (
                <Chip icon={<Clock size={10} />}>{EMPLOYMENT_LABELS[role.employment_type] || role.employment_type}</Chip>
              )}
              {role.compensation_type && (
                <Chip icon={<CurrencyDollar size={10} />}>{COMP_LABELS[role.compensation_type] || role.compensation_type}</Chip>
              )}
              {role.min_commitment_hours > 0 && (
                <Chip>{role.min_commitment_hours}+ hrs/wk</Chip>
              )}
              {role.positions_open > 1 && (
                <Chip>{role.positions_open} positions</Chip>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {role.description && (
              <Section title="About the role">
                <p className="text-[14px] text-white/80 leading-relaxed whitespace-pre-wrap">{role.description}</p>
              </Section>
            )}

            {role.responsibilities && role.responsibilities.length > 0 && (
              <Section title="Core responsibilities" icon={<ListChecks size={12} />}>
                <ul className="space-y-1.5">
                  {role.responsibilities.map((r: string, i: number) => (
                    <li key={i} className="text-[13px] text-white/80 flex items-start gap-2">
                      <span className="text-white/30 mt-1">•</span> {r}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {skills.length > 0 && (
              <Section title="Key skills required" icon={<Sparkle size={12} />}>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s: string) => (
                    <span key={s} className="text-[12px] font-semibold text-white/85 bg-white/[0.06] border border-white/[0.12] px-2.5 py-1 rounded-md">
                      {s}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {role.deliverables && role.deliverables.length > 0 && (
              <Section title="Expected deliverables" icon={<Check size={12} />}>
                <ul className="space-y-1.5">
                  {role.deliverables.map((d: string, i: number) => (
                    <li key={i} className="text-[13px] text-white/80 flex items-start gap-2">
                      <Check size={11} weight="bold" className="text-emerald-400 mt-1 flex-shrink-0" /> {d}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {role.compensation_details && (
              <Section title="Compensation" icon={<CurrencyDollar size={12} />}>
                <p className="text-[13px] text-white/80">{role.compensation_details}</p>
              </Section>
            )}

            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-3 text-[12px] text-white/50">
              <span className="flex items-center gap-1"><Users size={11} /> {role.applicants || 0} applicant{role.applicants !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>Posted {new Date(role.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
            {isOwner ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  onClick={deleteRole}
                  className="flex items-center gap-1.5 px-4 h-9 text-[13px] font-medium text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-red-500/25 rounded-md"
                >
                  <Trash size={12} /> Delete
                </button>
                <div className="flex-1" />
                <button
                  onClick={onClose}
                  className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md"
                >
                  Close
                </button>
                <button
                  onClick={() => onEdit?.(role)}
                  className="flex items-center gap-1.5 px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md"
                >
                  <PencilSimple size={12} /> Edit role
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md"
                >
                  Close
                </button>
                {currentUserId ? (
                  hasApplied ? (
                    <button
                      disabled
                      className="px-5 h-9 text-[13px] font-semibold bg-white/[0.06] border border-emerald-500/30 text-emerald-300 rounded-md flex items-center gap-1.5"
                    >
                      <Check size={12} weight="bold" /> Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => setApplying(true)}
                      disabled={checking}
                      className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-50"
                    >
                      Apply for this role →
                    </button>
                  )
                ) : (
                  <a
                    href="/login"
                    className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md flex items-center"
                  >
                    Sign in to apply →
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {applying && (
        <ApplyToRoleModal
          slug={slug}
          role={role}
          onClose={() => setApplying(false)}
          onApplied={() => {
            setHasApplied(true)
            onApplied?.()
          }}
        />
      )}
    </>
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

function Chip({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/75 bg-white/[0.05] border border-white/[0.1] px-2 py-1 rounded-md">
      {icon} {children}
    </span>
  )
}
