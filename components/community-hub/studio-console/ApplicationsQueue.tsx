'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserCheck, Check, X, Loader2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { ErrorState } from '@/components/kernel-ui'
import { formatDistanceToNow } from 'date-fns'
import { useStudioApplications } from '@/hooks/useCommunityStudio'
// FIXED: Imported DsrtRowSkeleton to fix missing component error
import { DsrtPanel, DsrtSection, DsrtEmpty, DsrtTabs, DsrtAvatar, DsrtButton, DsrtRowSkeleton } from '@/components/dsrt'

interface Props { slug: string }

const FILTERS = [
  { value: 'SUBMITTED,UNDER_REVIEW', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
]

export function ApplicationsQueue({ slug }: Props) {
  const [status, setStatus] = useState<string>('SUBMITTED,UNDER_REVIEW')
  const { items, loading, error, reload, removeItem } = useStudioApplications(slug, status)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const decide = async (applicationId: string, decision: 'APPROVED' | 'REJECTED') => {
    let reason: string | null = null
    if (decision === 'REJECTED') {
      reason = prompt('Optional reason for rejection (sent to applicant):')
    }
    setBusy(applicationId + decision)
    try {
      const res = await fetch(`/api/v1/communities/${slug}/applications/${applicationId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Decision failed')
        return
      }
      toast.success(decision === 'APPROVED' ? 'Approved' : 'Rejected')
      removeItem(applicationId)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <DsrtSection title="Applications" description="Review and decide who joins." headerVariant="large" />
        <DsrtTabs variant="segmented" tabs={FILTERS} activeValue={status} onValueChange={setStatus} className="overflow-x-auto w-full md:w-auto" />
      </div>

      {loading ? (
        <DsrtPanel><DsrtRowSkeleton count={5} /></DsrtPanel>
      ) : error ? (
        <DsrtPanel><ErrorState errorCode={error} onRetry={reload} /></DsrtPanel>
      ) : items.length === 0 ? (
        <DsrtPanel><DsrtEmpty icon={UserCheck} title="Inbox Zero" description="No applications match this filter." /></DsrtPanel>
      ) : (
        <div className="space-y-3">
          {items.map((a: any) => {
            const isPending = a.status === 'SUBMITTED' || a.status === 'UNDER_REVIEW'
            const isOpen = expanded.has(a.id)
            return (
              <DsrtPanel key={a.id} padding="none" className="overflow-hidden transition-all hover:border-white/[0.14]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                    <DsrtAvatar src={a.applicant?.avatar_url} name={a.applicant?.full_name} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/profile/${a.applicant?.username}`} className="text-[14px] font-bold text-white truncate hover:text-[#93c5fd] transition-colors">
                          {a.applicant?.full_name || 'Anonymous'}
                        </Link>
                        {a.applicant?.is_verified && <ShieldCheck className="w-3.5 h-3.5 text-[#93c5fd]" strokeWidth={2} />}
                      </div>
                      <p className="text-[11px] font-mono text-white/50 mt-0.5">
                        @{a.applicant?.username || '—'} · {formatDistanceToNow(new Date(a.submitted_at), { addSuffix: true })}
                      </p>
                      {a.applicant?.tagline && <p className="mt-1.5 text-[12.5px] text-white/70 truncate">{a.applicant.tagline}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {a.answers.length > 0 && (
                      <DsrtButton size="xs" variant="outline" onClick={() => toggle(a.id)}>
                        {isOpen ? <><ChevronUp className="w-3 h-3" /> Hide answers</> : <><ChevronDown className="w-3 h-3" /> Answers ({a.answers.length})</>}
                      </DsrtButton>
                    )}
                    {isPending && (
                      <>
                        <DsrtButton size="xs" variant="danger" disabled={busy === a.id + 'REJECTED'} onClick={() => decide(a.id, 'REJECTED')}>
                          {busy === a.id + 'REJECTED' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Reject
                        </DsrtButton>
                        <DsrtButton size="xs" variant="white" disabled={busy === a.id + 'APPROVED'} onClick={() => decide(a.id, 'APPROVED')}>
                          {busy === a.id + 'APPROVED' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Approve
                        </DsrtButton>
                      </>
                    )}
                    {!isPending && (
                      <span className={cn(
                        'text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-md border',
                        a.status === 'APPROVED' && 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
                        a.status === 'REJECTED' && 'border-red-500/30 bg-red-500/10 text-red-300',
                        a.status === 'WITHDRAWN' && 'border-white/[0.08] bg-white/[0.03] text-white/50'
                      )}>
                        {a.status}
                      </span>
                    )}
                  </div>
                </div>

                {isOpen && a.answers.length > 0 && (
                  <div className="border-t border-white/[0.06] bg-black/20 p-4 sm:p-5 space-y-4">
                    {a.answers.map((ans: any, i: number) => (
                      <div key={i}>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#93c5fd] mb-1.5">
                          {ans.question_label || ans.question_key}
                        </p>
                        <p className="text-[13px] text-white/85 whitespace-pre-wrap leading-relaxed bg-white/[0.02] border border-white/[0.04] p-3 rounded-lg">
                          {ans.answer_value || JSON.stringify(ans.answer_json) || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </DsrtPanel>
            )
          })}
        </div>
      )}
    </div>
  )
}