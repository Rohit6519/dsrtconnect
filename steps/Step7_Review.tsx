'use client'

import type { InvitationDraft } from '../hooks/useInvitationDraft'

interface Props {
  draft: InvitationDraft
  positions: any[]
}

export function Step7_Review({ draft, positions }: Props) {
  const position = draft.positionMode === 'existing'
    ? positions.find(p => p.id === draft.positionId)
    : null

  const positionTitle = position?.title || draft.newPositionData?.title || 'Team Member'
  const positionTeam = position?.team_name || draft.newPositionData?.team_name || null

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">Review & Send</h3>
        <p className="text-[12.5px] text-zinc-500 mt-1">
          Confirm the invitation details below.
        </p>
      </div>

      {/* Recipient */}
      <ReviewSection title="Recipient">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center text-[13px] font-bold text-white">
            {draft.invitedUser?.avatar_url ? (
              <img src={draft.invitedUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              draft.invitedUser?.full_name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="text-[13px] font-bold text-white">{draft.invitedUser?.full_name}</p>
            <p className="text-[11px] text-zinc-500">@{draft.invitedUser?.username}</p>
          </div>
        </div>
      </ReviewSection>

      {/* Position */}
      <ReviewSection title="Position">
        <p className="text-[13px] font-bold text-white">{positionTitle}</p>
        {positionTeam && (
          <p className="text-[11px] text-zinc-500 mt-0.5">{positionTeam}</p>
        )}
        <p className="text-[10.5px] font-mono uppercase tracking-widest text-zinc-500 mt-2">
          {draft.positionMode === 'new' ? 'New position will be created' : 'Existing position'}
        </p>
      </ReviewSection>

      {/* Responsibilities */}
      {draft.responsibilities.length > 0 && (
        <ReviewSection title="Responsibilities">
          <ul className="space-y-1">
            {draft.responsibilities.map((r, i) => (
              <li key={i} className="text-[12px] text-zinc-300 flex items-start gap-2">
                <span className="text-zinc-500 mt-0.5">·</span>
                {r}
              </li>
            ))}
          </ul>
        </ReviewSection>
      )}

      {/* Access */}
      <ReviewSection title="Access">
        <p className="text-[12.5px] font-semibold text-white capitalize">
          {draft.permissionTemplate.replace('_', ' ')}
          {draft.permissionTemplate === 'custom' && ' (Custom)'}
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {draft.permissions.length} {draft.permissions.length === 1 ? 'permission' : 'permissions'} granted
        </p>
      </ReviewSection>

      {/* Message */}
      {draft.personalMessage && (
        <ReviewSection title="Personal Message">
          <p className="text-[12.5px] text-zinc-300 leading-relaxed whitespace-pre-wrap italic">
            "{draft.personalMessage}"
          </p>
        </ReviewSection>
      )}

      {/* Expiration */}
      <ReviewSection title="Expiration">
        <p className="text-[12.5px] text-zinc-300">
          Invitation expires in <strong className="text-white">{draft.expirationDays} days</strong>
        </p>
      </ReviewSection>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3">
        <p className="text-[11.5px] text-emerald-200/80 leading-relaxed">
          <strong className="text-emerald-300">Ready to send.</strong> The recipient will receive a
          DSRT Mail notification and can Accept, Hold, or Reject from their inbox.
        </p>
      </div>
    </div>
  )
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#0d0d10] p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold mb-2">
        {title}
      </p>
      {children}
    </div>
  )
}