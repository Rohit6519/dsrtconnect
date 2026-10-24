'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Users, Search, Crown, Shield, Gavel, User,
  MoreHorizontal, UserMinus, UserX, Pause, Play,
  Loader2, ArrowRightLeft, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { ErrorState } from '@/components/kernel-ui'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { useStudioMembers } from '@/hooks/useCommunityStudio'
import { ReasonPromptDialog, ConfirmDialog } from '@/components/ui/reason-prompt-dialog'
import { DsrtPanel, DsrtSection, DsrtInput, DsrtTabs, DsrtEmpty, DsrtAvatar, DsrtRowSkeleton } from '@/components/dsrt'

const ROLE_META: Record<string, { label: string; icon: any; tone: string }> = {
  OWNER: { label: 'Owner', icon: Crown, tone: 'border-[#2c5282]/40 bg-[#1e3a5f]/20 text-[#93c5fd]' },
  ADMIN: { label: 'Admin', icon: Shield, tone: 'border-white/[0.08] bg-white/[0.04] text-white' },
  MODERATOR: { label: 'Moderator', icon: Gavel, tone: 'border-white/[0.06] bg-white/[0.02] text-white/70' },
  MEMBER: { label: 'Member', icon: User, tone: 'border-transparent bg-transparent text-white/50' },
}

const STATUS_META: Record<string, { label: string; tone: string }> = {
  ACTIVE: { label: 'Active', tone: 'text-emerald-300/85' },
  SUSPENDED: { label: 'Suspended', tone: 'text-amber-300/85' },
  BANNED: { label: 'Banned', tone: 'text-red-300/85' },
  LEFT: { label: 'Left', tone: 'text-white/50' },
  REMOVED: { label: 'Removed', tone: 'text-white/50' },
  PENDING: { label: 'Pending', tone: 'text-amber-300/85' },
  APPLIED: { label: 'Applied', tone: 'text-amber-300/85' },
  INVITED: { label: 'Invited', tone: 'text-white/60' },
  REJECTED: { label: 'Rejected', tone: 'text-white/50' },
}

const ROLE_FILTERS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'MODERATOR', label: 'Moderator' },
  { value: 'MEMBER', label: 'Member' },
]

const STATUS_FILTERS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'BANNED', label: 'Banned' },
  { value: 'ALL', label: 'All statuses' },
]

interface Props { slug: string }

type PendingUI =
  | { kind: 'action'; membershipId: string; action: 'suspend' | 'ban'; memberName: string }
  | { kind: 'remove'; membershipId: string; memberName: string }
  | null

export function MembersTable({ slug }: Props) {
  const [role, setRole] = useState<string>('ALL')
  const [status, setStatus] = useState<string>('ACTIVE')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [ui, setUi] = useState<PendingUI>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const effectiveRole = role === 'ALL' ? null : role
  const effectiveStatus = status === 'ALL' ? null : status

  const { items, loading, loadingMore, hasMore, error, reload, loadMore, patchItem } =
    useStudioMembers(slug, { role: effectiveRole, status: effectiveStatus, q })

  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading) return
    const io = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore() }, { rootMargin: '400px' })
    io.observe(sentinelRef.current)
    return () => io.disconnect()
  }, [hasMore, loading, loadMore])

  const doAction = async (membershipId: string, action: 'suspend' | 'unsuspend' | 'ban' | 'unban' | 'remove' | 'reinstate', reason?: string) => {
    setBusy(membershipId + action)
    try {
      const res = await fetch(`/api/v1/community/memberships/${membershipId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Action failed')
        return
      }
      toast.success('Done')
      patchItem(membershipId, { status: json?.data?.new_status })
      if (effectiveStatus && json?.data?.new_status !== effectiveStatus) reload()
    } finally {
      setBusy(null)
    }
  }

  const doAssignRole = async (membershipId: string, roleKey: string) => {
    setBusy(membershipId + 'role')
    try {
      const res = await fetch(`/api/v1/community/memberships/${membershipId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_key: roleKey }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Assign failed')
        return
      }
      toast.success('Role updated')
      reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <DsrtSection
          title="Members"
          description="Manage roles, restrictions, and community access."
          headerVariant="large"
        />

        <div className="flex flex-col xl:flex-row xl:items-center gap-3 bg-[#0a0a0f] sticky top-[57px] md:top-0 z-20 pt-2 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide flex-1">
            <DsrtTabs variant="segmented" tabs={ROLE_FILTERS} activeValue={role} onValueChange={setRole} className="shrink-0" />
            <DsrtTabs variant="segmented" tabs={STATUS_FILTERS} activeValue={status} onValueChange={setStatus} className="shrink-0" />
          </div>
          <div className="w-full xl:w-64 shrink-0">
            <DsrtInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" icon={<Search size={14} />} sizeVariant="sm" />
          </div>
        </div>

        {loading ? (
          <DsrtRowSkeleton count={8} />
        ) : error ? (
          <DsrtPanel><ErrorState errorCode={error} onRetry={reload} /></DsrtPanel>
        ) : items.length === 0 ? (
          <DsrtPanel><DsrtEmpty icon={Users} title="No members match" description="Try adjusting your filters or search." /></DsrtPanel>
        ) : (
          <DsrtPanel padding="none" className="overflow-hidden">
            <div className="hidden lg:grid grid-cols-[minmax(220px,2fr)_1fr_1fr_140px_60px] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Member</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Role</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Status</div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-white/40">Joined</div>
              <div />
            </div>

            <div className="divide-y divide-white/[0.04]">
              {items.map((m: any) => {
                const u = m.user
                const roleMeta = ROLE_META[m.top_role] || ROLE_META.MEMBER
                const statusMeta = STATUS_META[m.status] || { label: m.status, tone: 'text-white/60' }
                const isOwner = m.top_role === 'OWNER'
                const isBanned = m.status === 'BANNED'
                const isSuspended = m.status === 'SUSPENDED'
                const isActive = m.status === 'ACTIVE'
                const memberName = u?.full_name || u?.username || 'this member'

                return (
                  <div key={m.membership_id} className="grid grid-cols-[1fr_60px] lg:grid-cols-[minmax(220px,2fr)_1fr_1fr_140px_60px] gap-4 items-center p-4 lg:px-5 hover:bg-white/[0.02] transition-colors">
                    
                    <div className="flex items-center gap-3 min-w-0">
                      <DsrtAvatar src={u?.avatar_url} name={u?.full_name} size="sm" />
                      <div className="min-w-0">
                        <Link href={`/profile/${u?.username || ''}`} className="text-[14px] font-bold text-white truncate hover:text-[#93c5fd] flex items-center gap-1.5 transition-colors">
                          {u?.full_name || 'Unknown'}
                          {u?.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" strokeWidth={2} />}
                        </Link>
                        <p className="text-[12px] text-white/40 truncate">@{u?.username || '—'}</p>
                        
                        {/* Mobile metadata row */}
                        <div className="lg:hidden mt-1.5 flex items-center gap-2">
                          <span className={cn('inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider', roleMeta.tone)}>
                            <roleMeta.icon className="w-2.5 h-2.5" />
                            {roleMeta.label}
                          </span>
                          <span className={cn('text-[10px] font-mono uppercase tracking-wider', statusMeta.tone)}>
                            {statusMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden lg:flex items-center gap-1.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider', roleMeta.tone)}>
                        <roleMeta.icon className="w-3 h-3" />
                        {roleMeta.label}
                      </span>
                    </div>

                    <div className="hidden lg:flex flex-col gap-0.5 justify-center">
                      <span className={cn('text-[11px] font-mono uppercase tracking-wider', statusMeta.tone)}>
                        {statusMeta.label}
                      </span>
                      {m.restrictions?.length > 0 && (
                        <span className="text-[10px] text-white/40">
                          {m.restrictions.length} restriction{m.restrictions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="hidden lg:block text-[11px] font-mono uppercase tracking-wider text-white/40">
                      {formatDistanceToNow(new Date(m.joined_at), { addSuffix: true })}
                    </div>

                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={isOwner || busy?.startsWith(m.membership_id)}
                            className={cn(
                              'w-8 h-8 rounded-lg border border-white/[0.08] bg-white/[0.04] flex items-center justify-center transition-colors',
                              !isOwner ? 'text-white/60 hover:text-white hover:bg-white/[0.08]' : 'text-white/20 cursor-not-allowed border-transparent bg-transparent'
                            )}
                          >
                            {busy?.startsWith(m.membership_id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreHorizontal className="w-4 h-4" />}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 bg-[#0a0f1a] border-white/[0.08] text-white rounded-xl shadow-2xl py-1">
                          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-wider text-white/40">Change role</DropdownMenuLabel>
                          {['ADMIN', 'MODERATOR', 'MEMBER'].map((r) => (
                            <DropdownMenuItem key={r} onSelect={() => doAssignRole(m.membership_id, r)} className="focus:bg-white/[0.06] cursor-pointer text-[12.5px] font-medium py-1.5">
                              <ArrowRightLeft className="w-3.5 h-3.5 mr-2" /> Make {r.toLowerCase()}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          {isActive && (
                            <DropdownMenuItem onSelect={() => setUi({ kind: 'action', membershipId: m.membership_id, action: 'suspend', memberName })} className="focus:bg-white/[0.06] cursor-pointer text-[12.5px] font-medium py-1.5">
                              <Pause className="w-3.5 h-3.5 mr-2" /> Suspend
                            </DropdownMenuItem>
                          )}
                          {isSuspended && (
                            <DropdownMenuItem onSelect={() => doAction(m.membership_id, 'unsuspend')} className="focus:bg-white/[0.06] cursor-pointer text-[12.5px] font-medium py-1.5">
                              <Play className="w-3.5 h-3.5 mr-2" /> Unsuspend
                            </DropdownMenuItem>
                          )}
                          {!isBanned && (
                            <DropdownMenuItem onSelect={() => setUi({ kind: 'action', membershipId: m.membership_id, action: 'ban', memberName })} className="focus:bg-red-500/20 cursor-pointer text-red-400 focus:text-red-300 text-[12.5px] font-medium py-1.5">
                              <UserX className="w-3.5 h-3.5 mr-2" /> Ban
                            </DropdownMenuItem>
                          )}
                          {isBanned && (
                            <DropdownMenuItem onSelect={() => doAction(m.membership_id, 'unban')} className="focus:bg-white/[0.06] cursor-pointer text-[12.5px] font-medium py-1.5">
                              <Play className="w-3.5 h-3.5 mr-2" /> Unban
                            </DropdownMenuItem>
                          )}
                          {isActive && (
                            <DropdownMenuItem onSelect={() => setUi({ kind: 'remove', membershipId: m.membership_id, memberName })} className="focus:bg-red-500/20 cursor-pointer text-red-400 focus:text-red-300 text-[12.5px] font-medium py-1.5">
                              <UserMinus className="w-3.5 h-3.5 mr-2" /> Remove
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="py-6 flex justify-center">
                {loadingMore && <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider">Loading...</span>}
              </div>
            )}
          </DsrtPanel>
        )}
      </div>

      {ui?.kind === 'action' && (
        <ReasonPromptDialog
          open
          onOpenChange={(v) => !v && setUi(null)}
          title={ui.action === 'ban' ? `Ban ${ui.memberName}` : `Suspend ${ui.memberName}`}
          description={ui.action === 'ban' ? 'Ban is permanent until manually lifted. The affected member will be notified.' : 'Suspension prevents posting and participation. Reason is sent to the member.'}
          placeholder="Reason (optional but recommended)…"
          submitLabel={ui.action === 'ban' ? 'Ban member' : 'Suspend'}
          destructive
          onSubmit={async (reason) => { await doAction(ui.membershipId, ui.action, reason || undefined) }}
        />
      )}

      {ui?.kind === 'remove' && (
        <ConfirmDialog
          open
          onOpenChange={(v) => !v && setUi(null)}
          title={`Remove ${ui.memberName} from the community?`}
          description="They can re-apply or be re-invited later. No notification is sent."
          confirmLabel="Remove member"
          destructive
          onConfirm={async () => { await doAction(ui.membershipId, 'remove') }}
        />
      )}
    </>
  )
}