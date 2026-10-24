'use client'

import { StudioSectionCard, StudioTipCard } from '../primitives'
import { Info, Crown, Shield, Gavel, User } from 'lucide-react'

const ROLES = [
  {
    key: 'OWNER',
    name: 'Owner',
    icon: Crown,
    desc: 'Full authority. Can transfer ownership, archive, delete.',
  },
  {
    key: 'ADMIN',
    name: 'Admin',
    icon: Shield,
    desc: 'Manage members, content, moderation, and settings.',
  },
  {
    key: 'MODERATOR',
    name: 'Moderator',
    icon: Gavel,
    desc: 'Review content, warn, remove, and ban.',
  },
  {
    key: 'MEMBER',
    name: 'Member',
    icon: User,
    desc: 'Standard participant. Posts and votes.',
  },
]

export function Step5Roles() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard
          title="System roles"
          description="Every community starts with these four roles. You'll be able to create custom roles from the Studio operating console."
        >
          <div className="space-y-2">
            {ROLES.map((r) => {
              const Icon = r.icon
              return (
                <div
                  key={r.key}
                  className="flex items-start gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3"
                >
                  <div className="w-8 h-8 rounded-lg border border-white/[0.06] bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white/70" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-white">{r.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-white/55 leading-relaxed">{r.desc}</p>
                  </div>
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 flex-shrink-0">
                    system
                  </span>
                </div>
              )
            })}
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="Roles later">
          <p>You'll auto-become the Owner when you publish.</p>
          <p>From Studio → Roles & Permissions you can create custom roles like "Event Organizer" or "Recruiter" with granular permission bundles.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}