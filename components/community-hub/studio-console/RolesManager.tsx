'use client'

import { Crown, Shield, Gavel, User, Info } from 'lucide-react'
import { DsrtSection, DsrtPanel, DsrtGrid } from '@/components/dsrt'

const SYSTEM_ROLES = [
  { key: 'OWNER', name: 'Owner', icon: Crown, permissions: 'All permissions. Ownership can be transferred.', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { key: 'ADMIN', name: 'Admin', icon: Shield, permissions: 'Manage members, content, moderation, and settings.', color: 'text-white border-white/[0.14] bg-white/[0.06]' },
  { key: 'MODERATOR', name: 'Moderator', icon: Gavel, permissions: 'Review content, warn, remove, and ban.', color: 'text-white/70 border-white/[0.08] bg-white/[0.03]' },
  { key: 'MEMBER', name: 'Member', icon: User, permissions: 'Post, vote, participate.', color: 'text-white/40 border-white/[0.04] bg-transparent' },
]

export function RolesManager({ slug }: { slug: string }) {
  return (
    <div className="space-y-6">
      <DsrtSection
        title="Roles & Permissions"
        description="System roles govern what actions users can take inside your community."
        headerVariant="large"
      />

      <DsrtGrid cols={{ base: 1, md: 2 }} gap="md">
        {SYSTEM_ROLES.map((r) => {
          const Icon = r.icon
          return (
            <DsrtPanel key={r.key} padding="md" className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${r.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-[15px] font-bold text-white">{r.name}</h4>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-white/30 px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02]">
                    System Default
                  </span>
                </div>
                <p className="text-[13px] text-white/60 leading-relaxed">{r.permissions}</p>
              </div>
            </DsrtPanel>
          )
        })}
      </DsrtGrid>

      <DsrtPanel variant="inset" padding="md">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-[#93c5fd]" strokeWidth={2} />
          <h4 className="text-[13px] font-bold text-[#93c5fd]">Custom Roles</h4>
        </div>
        <p className="text-[13px] text-white/60 leading-relaxed">
          Custom roles with fine-grained permission bundles (e.g., Event Organizer, Lead Recruiter) will arrive in a future DSRT platform update. For now, assign a System Role via the Members tab.
        </p>
      </DsrtPanel>
    </div>
  )
}