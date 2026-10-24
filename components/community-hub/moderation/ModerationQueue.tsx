'use client'

import { useState } from 'react'
import { AlertCircle, Clock, Shield, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SectionHeader, EmptyState, ErrorState, SkeletonRows, LoadingState } from '@/components/kernel-ui'
import { formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useModerationQueue } from '@/hooks/useCommunityModeration'
import { ModerationCaseDetail } from './ModerationCaseDetail'

interface Props {
  slug: string
}

const PRIORITY_TONE: Record<string, string> = {
  URGENT: 'border-red-500/25 bg-red-500/10 text-red-300',
  HIGH: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  NORMAL: 'border-white/[0.08] bg-white/[0.03] text-white/70',
  LOW: 'border-white/[0.04] bg-white/[0.02] text-white/50',
}

const STATUS_TONE: Record<string, string> = {
  OPEN: 'text-amber-300/85',
  UNDER_REVIEW: 'text-blue-300/85',
  RESOLVED: 'text-emerald-300/85',
  DISMISSED: 'text-white/50',
  ESCALATED: 'text-red-300/85',
}

export function ModerationQueue({ slug }: Props) {
  const [status, setStatus] = useState('OPEN,UNDER_REVIEW')
  const [priority, setPriority] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const { items, loading, error, reload, hasMore, loadMore } = useModerationQueue(slug, { status, priority: priority || undefined })

  const statusFilters = [
    { key: 'OPEN,UNDER_REVIEW', label: 'Active' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'DISMISSED', label: 'Dismissed' },
  ]

  const priorityFilters = [
    { key: null, label: 'All' },
    { key: 'URGENT', label: 'Urgent' },
    { key: 'HIGH', label: 'High' },
    { key: 'NORMAL', label: 'Normal' },
    { key: 'LOW', label: 'Low' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <SectionHeader
          title="Moderation queue"
          description="Reported content and cases requiring review."
          variant="mono"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors',
                  status === f.key ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
            {priorityFilters.map((p) => (
              <button
                key={String(p.key)}
                onClick={() => setPriority(p.key)}
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                  priority === p.key ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonRows count={4} />
      ) : error ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <ErrorState errorCode={error} onRetry={reload} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState icon={Shield} title="Nothing in the queue" description="No reports match your filters." />
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((c: any) => {
              const priorityCls = PRIORITY_TONE[c.priority] || PRIORITY_TONE.NORMAL
              const statusCls = STATUS_TONE[c.status] || 'text-white/60'
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelectedCaseId(c.id)}
                    className="w-full text-left rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] hover:border-white/[0.12] transition-colors p-4 flex items-center gap-4"
                  >
                    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider flex-shrink-0', priorityCls)}>
                      <AlertCircle className="w-3 h-3" strokeWidth={1.75} />
                      {c.priority}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-semibold text-white capitalize">
                          {c.target_type} case
                        </p>
                        <span className="text-[10.5px] font-mono uppercase tracking-wider text-white/40">·</span>
                        <span className={cn('text-[10.5px] font-mono uppercase tracking-wider', statusCls)}>
                          {c.status.replace('_', ' ').toLowerCase()}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-white/45 flex-wrap">
                        <span>{c.report_count} report{c.report_count === 1 ? '' : 's'}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" strokeWidth={1.75} />
                          Opened {formatDistanceToNow(new Date(c.opened_at), { addSuffix: true })}
                        </span>
                        {c.target_author && (
                          <span className="inline-flex items-center gap-1.5">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={c.target_author.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[7px] bg-white/[0.06]">{(c.target_author.full_name || '?').charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{c.target_author.full_name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" strokeWidth={1.75} />
                  </button>
                </li>
              )
            })}
          </ul>
          {hasMore && (
            <div className="pt-4">
              <button onClick={loadMore} className="text-[12px] text-white/60 hover:text-white transition-colors">
                Load more
              </button>
            </div>
          )}
        </>
      )}

      {selectedCaseId && (
        <ModerationCaseDetail
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onResolved={() => { setSelectedCaseId(null); reload() }}
        />
      )}
    </div>
  )
}