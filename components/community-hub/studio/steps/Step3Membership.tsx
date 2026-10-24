'use client'

import { StudioSectionCard, StudioField, StudioTipCard } from '../primitives'
import type { DraftData } from '@/lib/community/service.drafts'
import { cn } from '@/lib/utils'
import { Info } from 'lucide-react'

const POLICIES = [
  { key: 'OPEN', title: 'Open', body: 'Anyone can join immediately.' },
  { key: 'APPROVAL_REQUIRED', title: 'Approval required', body: 'People submit a short application. Admins approve.' },
  { key: 'INVITE_ONLY', title: 'Invite only', body: 'Membership only through invitations from admins.' },
  { key: 'CLOSED', title: 'Closed', body: 'No new members. Existing members stay.' },
]

interface Props {
  data: DraftData
  patch: (p: Partial<DraftData>) => void
}

export function Step3Membership({ data, patch }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <StudioSectionCard title="Join policy" description="How do new members become part of this community?">
          <div className="grid gap-2 md:grid-cols-2">
            {POLICIES.map((p) => (
              <button
                key={p.key}
                onClick={() => patch({ join_policy: p.key as any })}
                className={cn(
                  'text-left rounded-xl border p-3.5 transition-colors',
                  data.join_policy === p.key
                    ? 'border-white/[0.2] bg-white/[0.06]'
                    : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                )}
              >
                <p className="text-[13px] font-semibold text-white">{p.title}</p>
                <p className="mt-1 text-[11.5px] text-white/55 leading-relaxed">{p.body}</p>
              </button>
            ))}
          </div>
        </StudioSectionCard>

        <StudioSectionCard title="Member powers" description="Allow ordinary members to help grow the community.">
          <div className="space-y-3">
            <ToggleRow
              label="Allow members to invite others"
              hint="Trusted members can send invitations."
              checked={!!data.allow_member_invites}
              onChange={(v) => patch({ allow_member_invites: v })}
            />
            <ToggleRow
              label="Show member directory"
              hint="Members can browse who else is in the community."
              checked={data.show_member_directory !== false}
              onChange={(v) => patch({ show_member_directory: v })}
            />
            <ToggleRow
              label="Show member count publicly"
              checked={data.show_member_count !== false}
              onChange={(v) => patch({ show_member_count: v })}
            />
          </div>
        </StudioSectionCard>
      </div>

      <div className="space-y-3">
        <StudioTipCard icon={Info} title="Choosing a policy">
          <p>Start with <strong>Open</strong> if you want growth.</p>
          <p>Use <strong>Approval required</strong> for a curated experience.</p>
          <p>Switch policies anytime later from Studio → Settings.</p>
        </StudioTipCard>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] hover:bg-white/[0.03] transition-colors p-3 cursor-pointer">
      <div className="min-w-0">
        <p className="text-[13px] text-white/85">{label}</p>
        {hint && <p className="mt-0.5 text-[11.5px] text-white/45">{hint}</p>}
      </div>
      <span
        className={cn(
          'relative inline-flex h-5 w-9 rounded-full transition-colors border',
          checked ? 'bg-white border-white' : 'bg-white/[0.04] border-white/[0.1]'
        )}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full transition-transform',
            checked ? 'left-4 bg-black' : 'left-0.5 bg-white'
          )}
        />
      </span>
    </label>
  )
}