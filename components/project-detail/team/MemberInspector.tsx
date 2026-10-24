'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, EnvelopeSimple, UserMinus } from '@phosphor-icons/react'
import { DsrtAvatar, DsrtPanel } from '@/components/dsrt'
import { cn } from '@/lib/utils'
import type { TeamMember } from '@/types/team'
import { MemberOffboardingModal } from './console/MemberOffboardingModal'

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS (Shared across Graph and People Views)
// ═══════════════════════════════════════════════════════════════════════════

export const STATE_DOT_COLOR: Record<string, string> = {
  active:      'bg-emerald-400',
  invited:     'bg-amber-400',
  viewed:      'bg-amber-400',
  accepted:    'bg-blue-400',
  onboarding:  'bg-blue-400',
  paused:      'bg-orange-400',
  offboarding: 'bg-orange-400',
  removed:     'bg-white/30',
  declined:    'bg-red-400',
  expired:     'bg-white/20',
  revoked:     'bg-white/20',
}

export const STATE_LABEL: Record<string, string> = {
  active:      'Active',
  invited:     'Invited',
  viewed:      'Viewed invite',
  accepted:    'Accepted',
  onboarding:  'Onboarding',
  paused:      'Paused',
  offboarding: 'Offboarding',
  removed:     'Removed',
  declined:    'Declined',
  expired:     'Expired',
  revoked:     'Revoked',
}

interface MemberInspectorProps {
  member: TeamMember
  slug: string
  isOwner: boolean
  currentUserId: string | null
  onClose: () => void
}

export function MemberInspector({
  member,
  slug,
  isOwner,
  currentUserId,
  onClose,
}: MemberInspectorProps) {
  const [offboardingOpen, setOffboardingOpen] = useState(false)

  const stateKey = member.member_state
  const dotColor = STATE_DOT_COLOR[stateKey] || 'bg-white/30'
  const stateLabel = STATE_LABEL[stateKey] || stateKey

  const resps = member.responsibilities || []
  const activeObj = member.active_objectives_count || 0
  const blockedObj = member.blocked_objectives_count || 0

  return (
    <div className="hidden lg:flex flex-col w-[380px] shrink-0 ml-6 animate-in slide-in-from-right-5 duration-200">
      <DsrtPanel padding="none" variant="default" className="overflow-hidden sticky top-[var(--dsrt-nav-h)] max-h-[calc(100vh-var(--dsrt-nav-h)-80px)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <DsrtAvatar
              src={member.user?.avatar_url}
              name={member.user?.full_name || 'M'}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-white truncate">
                {member.user?.full_name || 'Pending'}
              </p>
              {member.user?.username && (
                <p className="text-[11.5px] font-mono text-white/40 truncate">
                  @{member.user.username}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close inspector"
            className="w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors shrink-0"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-5 space-y-6">
          
          {/* Role + State */}
          <div className="space-y-3">
            <InspectorField label="Role">
              <span className="text-[13.5px] font-bold text-white">{member.role || 'Not assigned'}</span>
            </InspectorField>
            <InspectorField label="Department">
              <span className="text-[13.5px] text-white/80">{member.department || '—'}</span>
            </InspectorField>
            <InspectorField label="Seniority">
              <span className="text-[13.5px] text-white/80 capitalize">{member.seniority || '—'}</span>
            </InspectorField>
            <InspectorField label="Status">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', dotColor)} />
                <span className="text-[13.5px] text-white/80 font-medium">{stateLabel}</span>
              </div>
            </InspectorField>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Responsibilities */}
          <div>
            <h4 className="text-[10.5px] font-mono uppercase tracking-widest text-white/50 font-bold mb-3">
              Responsibilities
            </h4>
            {resps.length === 0 ? (
              <p className="text-[12.5px] text-white/40">No responsibilities assigned.</p>
            ) : (
              <div className="space-y-2">
                {resps.map(r => (
                  <div
                    key={r.id}
                    className="flex items-start gap-2.5 text-[13px] text-white/80"
                  >
                    <span className="w-1 h-1 rounded-full bg-white/40 mt-[7px] shrink-0" />
                    <div className="min-w-0">
                      <span className={cn('block', r.is_primary && 'font-semibold text-white')}>
                        {r.title}
                      </span>
                      {r.is_primary && (
                        <span className="text-[10px] font-mono text-[#38bdf8] uppercase tracking-wider mt-0.5 block">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Current Work */}
          <div>
            <h4 className="text-[10.5px] font-mono uppercase tracking-widest text-white/50 font-bold mb-3">
              Current Work
            </h4>
            <div className="space-y-2">
              <InspectorMetric label="Active objectives" value={activeObj} />
              {blockedObj > 0 && (
                <InspectorMetric label="Blocked" value={blockedObj} highlight="text-red-400" />
              )}
            </div>
          </div>

          <div className="h-px bg-white/[0.06]" />

          {/* Meta */}
          <div className="space-y-3">
            {member.working_model && (
              <InspectorField label="Working model">
                <span className="text-[13px] text-white/80 capitalize">
                  {member.working_model.replace(/_/g, ' ')}
                </span>
              </InspectorField>
            )}
            {member.commitment_hours && (
              <InspectorField label="Commitment">
                <span className="text-[13px] text-white/80">
                  {member.commitment_hours} hrs / week
                </span>
              </InspectorField>
            )}
            {member.timezone && (
              <InspectorField label="Timezone">
                <span className="text-[13px] text-white/80">{member.timezone}</span>
              </InspectorField>
            )}
            {member.start_date && (
              <InspectorField label="Start date">
                <span className="text-[13px] text-white/80">
                  {new Date(member.start_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </InspectorField>
            )}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/[0.06] flex items-center gap-2 flex-shrink-0">
          {member.user?.username && (
            <Link
              href={`/profile/${member.user.username}`}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg text-[12.5px] font-semibold text-white/80 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
            >
              View profile
            </Link>
          )}
          {member.user?.username && currentUserId && member.user_id !== currentUserId && (
            <Link
              href={`/inbox?compose=true&to=${member.user.username}`}
              className="flex items-center justify-center gap-1.5 h-9 w-9 rounded-lg text-white/60 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-colors"
              title="Send message"
            >
              <EnvelopeSimple size={15} weight="fill" />
            </Link>
          )}
          {isOwner && (
            <button
              onClick={() => setOffboardingOpen(true)}
              className="flex items-center justify-center gap-1.5 h-9 w-9 rounded-lg text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 transition-colors"
              title="Offboard member"
            >
              <UserMinus size={15} weight="fill" />
            </button>
          )}
        </div>
      </DsrtPanel>

      {/* Offboarding Flow Modal */}
      {offboardingOpen && (
        <MemberOffboardingModal
          member={member}
          slug={slug}
          projectId={member.project_id}
          onClose={() => setOffboardingOpen(false)}
          onSuccess={() => {
            setOffboardingOpen(false)
            onClose() // Close the inspector panel to reset selection state
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function InspectorField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-mono uppercase tracking-wider text-white/45 shrink-0">{label}</span>
      <div className="min-w-0 text-right">{children}</div>
    </div>
  )
}

function InspectorMetric({ label, value, highlight }: { label: string; value: number; highlight?: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className={highlight || 'text-white/70'}>{label}</span>
      <span className="font-mono text-white/50">{value}</span>
    </div>
  )
}