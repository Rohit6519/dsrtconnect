'use client'

import { useState } from 'react'
import { Mail, X, Loader2, Copy, Check } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { ErrorState } from '@/components/kernel-ui'
import { formatDistanceToNow } from 'date-fns'
import { useStudioInvitations } from '@/hooks/useCommunityStudio'
import { DsrtPanel, DsrtSection, DsrtEmpty, DsrtInput, DsrtButton, DsrtRowSkeleton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

interface Props { slug: string; communityId: string }

export function InvitationsManager({ slug, communityId }: Props) {
  const { items, loading, error, reload } = useStudioInvitations(slug)
  const [email, setEmail] = useState('')
  const [roleKey, setRoleKey] = useState<'MEMBER' | 'MODERATOR' | 'ADMIN'>('MEMBER')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [lastLink, setLastLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const send = async () => {
    if (!email.trim()) { toast.error('Enter an email'); return }
    setSending(true)
    try {
      const res = await fetch(`/api/v1/communities/${communityId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `inv-${communityId}-${Date.now()}` },
        body: JSON.stringify({ invited_email: email.trim(), role_key: roleKey, message: message.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json?.error?.message || 'Could not send invitation'); return }
      toast.success('Invitation created')
      setLastLink(typeof window !== 'undefined' ? `${window.location.origin}${json.data.invite_url}` : json.data.invite_url)
      setEmail('')
      setMessage('')
      reload()
    } finally {
      setSending(false)
    }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this invitation?')) return
    const res = await fetch(`/api/v1/community/invitations/${id}/revoke`, { method: 'POST' })
    if (!res.ok) { toast.error('Could not revoke'); return }
    toast.success('Revoked')
    reload()
  }

  const pending = items.filter((i: any) => i.status === 'PENDING')
  const history = items.filter((i: any) => i.status !== 'PENDING')

  return (
    <div className="space-y-6">
      <DsrtPanel>
        <DsrtSection title="Send an Invitation" headerVariant="mono">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] pt-2">
            <DsrtInput value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" />
            <select value={roleKey} onChange={(e) => setRoleKey(e.target.value as any)} className="h-10 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white px-3 focus:outline-none focus:border-white/[0.2]">
              <option value="MEMBER" className="bg-[#0f172a]">Member</option>
              <option value="MODERATOR" className="bg-[#0f172a]">Moderator</option>
              <option value="ADMIN" className="bg-[#0f172a]">Admin</option>
            </select>
            <DsrtButton variant="primary" loading={sending} onClick={send} className="h-10">Send</DsrtButton>
          </div>
          <textarea
            value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
            placeholder="Optional personal message..."
            className="mt-3 w-full rounded-lg bg-white/[0.03] border border-white/[0.08] text-white text-[13px] px-3 py-2.5 focus:outline-none focus:border-white/[0.2] resize-none"
          />
          {lastLink && (
            <div className="mt-4 p-3 rounded-lg bg-[#1e3a5f]/20 border border-[#2c5282]/40 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <p className="text-[12px] text-[#93c5fd] font-mono truncate">{lastLink}</p>
              <DsrtButton size="xs" variant="white" onClick={async () => { await navigator.clipboard.writeText(lastLink); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy link'}
              </DsrtButton>
            </div>
          )}
        </DsrtSection>
      </DsrtPanel>

      <DsrtPanel padding="none" className="overflow-hidden">
        <DsrtSection title="Pending Invitations" headerVariant="mono" className="p-4 sm:p-5 border-b border-white/[0.06]" />
        {loading ? <div className="p-4"><DsrtRowSkeleton count={3} /></div> : error ? <div className="p-4"><ErrorState errorCode={error} onRetry={reload} /></div> : pending.length === 0 ? <DsrtEmpty icon={Mail} title="No pending invites" /> : (
          <div className="divide-y divide-white/[0.04]">
            {pending.map((inv: any) => <InvitationRow key={inv.id} inv={inv} onRevoke={() => revoke(inv.id)} />)}
          </div>
        )}
      </DsrtPanel>

      {history.length > 0 && (
        <DsrtPanel padding="none" className="overflow-hidden">
          <DsrtSection title="History" headerVariant="mono" className="p-4 sm:p-5 border-b border-white/[0.06]" />
          <div className="divide-y divide-white/[0.04]">
            {history.slice(0, 15).map((inv: any) => <InvitationRow key={inv.id} inv={inv} history />)}
          </div>
        </DsrtPanel>
      )}
    </div>
  )
}

function InvitationRow({ inv, onRevoke, history }: { inv: any; onRevoke?: () => void; history?: boolean }) {
  const statusTone: Record<string, string> = {
    PENDING: 'text-amber-300 border-amber-500/30 bg-amber-500/10',
    ACCEPTED: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10',
    DECLINED: 'text-white/50 border-white/[0.1] bg-white/[0.04]',
    EXPIRED: 'text-white/40 border-white/[0.08] bg-transparent',
    REVOKED: 'text-white/40 border-white/[0.08] bg-transparent',
  }
  return (
    <div className="flex items-center gap-3 p-4 sm:p-5 hover:bg-white/[0.02] transition-colors">
      <div className="w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-white/50 shrink-0">
        <Mail className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-bold text-white truncate">{inv.invitee?.full_name || inv.invited_email || 'Recipient'}</p>
        <p className="text-[11px] font-mono text-white/40 truncate mt-0.5">
          {inv.role?.name ? `${inv.role.name}` : 'Member'} · {formatDistanceToNow(new Date(inv.created_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded border', statusTone[inv.status] || 'text-white/50')}>
          {inv.status}
        </span>
        {!history && onRevoke && (
          <DsrtButton size="icon-sm" variant="ghost" onClick={onRevoke} className="hover:text-red-400 hover:bg-red-500/10">
            <X size={14} />
          </DsrtButton>
        )}
      </div>
    </div>
  )
}