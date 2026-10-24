'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  EnvelopeSimple, Clock, CheckCircle, XCircle, Prohibit,
  Copy, Trash, CircleNotch, WarningCircle, UserPlus, Eye
} from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { DsrtAvatar, DsrtButton } from '@/components/dsrt'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Props {
  projectId: string
  slug: string
  onOpenComposer: () => void
}

interface Invitation {
  id: string
  invited_user_id: string | null
  invited_email: string | null
  invited_name: string | null
  state: 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired' | 'revoked' | 'onboarding' | 'completed'
  token_prefix: string
  created_at: string
  expires_at: string
  snapshot: any
  view_count: number
  invited_user?: {
    full_name: string | null
    username: string | null
    avatar_url: string | null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatTime(iso: string) {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isExpired(iso: string) {
  return new Date(iso) < new Date()
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function InvitationsManager({ projectId, slug, onOpenComposer }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [filter, setFilter] = useState<'pending' | 'accepted' | 'declined' | 'revoked'>('pending')
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const fetchInvites = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: dbErr } = await supabase
        .from('project_team_invitations')
        .select(`
          id, invited_user_id, invited_email, invited_name, state, 
          token_prefix, created_at, expires_at, snapshot, view_count,
          invited_user:users!project_team_invitations_invited_user_id_fkey(full_name, username, avatar_url)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (dbErr) throw dbErr
      if (isMountedRef.current) setInvitations(data as any[])
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || 'Failed to load invitations')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchInvites() }, [fetchInvites])

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation? The link will immediately stop working.')) return
    
    setRevokingId(id)
    try {
      const res = await fetch(`/api/projects/${slug}/team/invitations/${id}/revoke`, { method: 'POST' })
      if (!res.ok) throw new Error()
      
      toast.success('Invitation revoked')
      setInvitations(prev => prev.map(inv => inv.id === id ? { ...inv, state: 'revoked' } : inv))
    } catch {
      toast.error('Failed to revoke invitation')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopy = (id: string, prefix: string) => {
    // We cannot copy the full link here because the token hash is not the plaintext token.
    // The plaintext token is only shown once during creation. We just copy the ID prefix for reference.
    navigator.clipboard.writeText(id)
    toast.success('Invitation ID copied to clipboard')
  }

  // ─── DERIVED ─────────────────────────────────────────────────────────

  const filtered = invitations.filter(inv => {
    if (filter === 'pending') return ['sent', 'viewed', 'expired'].includes(inv.state)
    if (filter === 'accepted') return ['accepted', 'onboarding', 'completed'].includes(inv.state)
    return inv.state === filter
  })

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════

  return (
    <div className="animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-[18px] font-bold text-white tracking-tight">Invitations</h3>
          <p className="text-[12.5px] text-white/50 mt-0.5">
            Manage outgoing requests to join your team.
          </p>
        </div>
        <DsrtButton
          variant="primary"
          size="sm"
          className="bg-white text-black hover:bg-white/90"
          onClick={onOpenComposer}
        >
          <UserPlus size={14} weight="bold" /> Invite member
        </DsrtButton>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06] mb-6 overflow-x-auto scrollbar-hide">
        {[
          { id: 'pending', label: 'Pending' },
          { id: 'accepted', label: 'Accepted' },
          { id: 'declined', label: 'Declined' },
          { id: 'revoked', label: 'Revoked' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={cn(
              'px-4 py-3 text-[13px] font-semibold whitespace-nowrap border-b-[3px] -mb-px transition-colors outline-none',
              filter === t.id
                ? 'text-[#38bdf8] border-[#38bdf8]'
                : 'text-white/45 border-transparent hover:text-white/75'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <CircleNotch size={18} className="animate-spin text-white/30" />
            <span className="text-[12px] font-mono text-white/30 uppercase tracking-wider">Loading...</span>
          </div>
        ) : error ? (
          <div className="py-12 flex flex-col items-center gap-3 bg-red-500/[0.02] border border-red-500/10 rounded-2xl">
            <WarningCircle size={22} className="text-red-400" />
            <span className="text-[13px] text-red-300">{error}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center border border-white/[0.04] bg-white/[0.01] rounded-2xl">
            <EnvelopeSimple size={32} weight="fill" className="text-white/20 mx-auto mb-3" />
            <p className="text-[14px] font-semibold text-white/60 mb-1">No {filter} invitations</p>
            <p className="text-[12.5px] text-white/40">
              When you send invitations, they will appear here.
            </p>
          </div>
        ) : (
          filtered.map(inv => (
            <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.03] transition-colors">
              
              {/* Recipient Info */}
              <div className="flex items-center gap-4 min-w-0">
                <DsrtAvatar 
                  src={inv.invited_user?.avatar_url} 
                  name={inv.invited_user?.full_name || inv.invited_name || inv.invited_email || '?'}
                  size="md"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-[14.5px] font-bold text-white truncate">
                      {inv.invited_user?.full_name || inv.invited_name || inv.invited_email}
                    </p>
                    {inv.state === 'viewed' && (
                      <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        <Eye size={10} weight="fill" /> Viewed
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] text-white/50 truncate">
                    Invited as <strong className="text-white/80">{inv.snapshot?.role_label || 'Member'}</strong>
                  </p>
                  <p className="text-[11.5px] text-white/30 font-mono mt-1">
                    Sent {formatTime(inv.created_at)} · ID: {inv.token_prefix}…
                  </p>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-[240px] shrink-0">
                <div className="text-left sm:text-right">
                  {inv.state === 'accepted' || inv.state === 'onboarding' || inv.state === 'completed' ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400">
                      <CheckCircle size={14} weight="fill" /> Accepted
                    </span>
                  ) : inv.state === 'declined' ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-red-400">
                      <XCircle size={14} weight="fill" /> Declined
                    </span>
                  ) : inv.state === 'revoked' ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-white/40">
                      <Prohibit size={14} weight="fill" /> Revoked
                    </span>
                  ) : isExpired(inv.expires_at) ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-bold text-white/40">
                      <Clock size={14} weight="fill" /> Expired
                    </span>
                  ) : (
                    <div>
                      <span className="flex items-center justify-start sm:justify-end gap-1.5 text-[12px] font-bold text-amber-400 mb-0.5">
                        <Clock size={14} weight="fill" /> Pending
                      </span>
                      <p className="text-[10px] text-white/30 font-mono">
                        Expires {formatTime(inv.expires_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions (Only for pending) */}
                {['sent', 'viewed'].includes(inv.state) && !isExpired(inv.expires_at) && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleCopy(inv.id, inv.token_prefix)}
                      className="w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                      title="Copy ID"
                    >
                      <Copy size={14} weight="bold" />
                    </button>
                    <button 
                      onClick={() => handleRevoke(inv.id)}
                      disabled={revokingId === inv.id}
                      className="w-8 h-8 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors disabled:opacity-50"
                      title="Revoke invitation"
                    >
                      {revokingId === inv.id ? <CircleNotch size={14} className="animate-spin" /> : <Prohibit size={14} weight="bold" />}
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  )
}