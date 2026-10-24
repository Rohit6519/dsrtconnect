'use client'

import { useState, useTransition } from 'react'
import {
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  EyeOff,
  Trash2,
  Ban,
  Pause,
  UserMinus,
  MessageSquareWarning,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { LoadingState } from '@/components/kernel-ui'
import { ReasonPromptDialog } from '@/components/ui/reason-prompt-dialog'
import { useModerationCase } from '@/hooks/useCommunityModeration'

interface Props {
  caseId: string
  onClose: () => void
  onResolved?: () => void
}

const ACTIONS = [
  { key: 'WARN', label: 'Warn user', icon: MessageSquareWarning, tone: 'default' as const, resolveByDefault: false },
  { key: 'CONTENT_HIDE', label: 'Hide content', icon: EyeOff, tone: 'default' as const, resolveByDefault: true },
  { key: 'CONTENT_REMOVE', label: 'Remove content', icon: Trash2, tone: 'danger' as const, resolveByDefault: true },
  { key: 'RESTRICT_POSTING', label: 'Restrict posting (7d)', icon: Pause, tone: 'default' as const, duration: 168, resolveByDefault: false },
  { key: 'MEMBER_SUSPEND', label: 'Suspend member (7d)', icon: Pause, tone: 'danger' as const, duration: 168, resolveByDefault: true },
  { key: 'MEMBER_BAN', label: 'Ban member', icon: Ban, tone: 'danger' as const, resolveByDefault: true },
  { key: 'MEMBER_REMOVE', label: 'Remove member', icon: UserMinus, tone: 'danger' as const, resolveByDefault: true },
]

type ActiveAction =
  | { kind: 'take'; actionKey: string; actionLabel: string; destructive: boolean; duration?: number; resolve: boolean }
  | { kind: 'dismiss' }
  | null

export function ModerationCaseDetail({ caseId, onClose, onResolved }: Props) {
  const { detail, loading } = useModerationCase(caseId)
  const [pending, startTransition] = useTransition()
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)

  const openTake = (a: (typeof ACTIONS)[number]) => {
    setActiveAction({
      kind: 'take',
      actionKey: a.key,
      actionLabel: a.label,
      destructive: a.tone === 'danger',
      duration: (a as any).duration,
      resolve: a.resolveByDefault,
    })
  }

  const openDismiss = () => setActiveAction({ kind: 'dismiss' })
  const closeAction = () => setActiveAction(null)

  const submitTakeAction = async (reason: string) => {
    if (!activeAction || activeAction.kind !== 'take') return
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/v1/community/moderation/cases/${caseId}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action_type: activeAction.actionKey,
              reason: reason || undefined,
              duration_hours: activeAction.duration,
              resolve_case: activeAction.resolve,
            }),
          })
          const json = await res.json()
          if (!res.ok) {
            toast.error(json?.error?.message || 'Action failed')
            reject(new Error('failed'))
            return
          }
          toast.success('Action recorded')
          onResolved?.()
          resolve()
        } catch {
          toast.error('Network error')
          reject(new Error('network'))
        }
      })
    })
  }

  const submitDismiss = async (reason: string) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/v1/community/moderation/cases/${caseId}/dismiss`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || undefined }),
          })
          if (!res.ok) {
            toast.error('Dismiss failed')
            reject(new Error('failed'))
            return
          }
          toast.message('Case dismissed')
          onResolved?.()
          resolve()
        } catch {
          toast.error('Network error')
          reject(new Error('network'))
        }
      })
    })
  }

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="bg-[#0c0c12] border-white/[0.08] text-white max-w-3xl sm:rounded-2xl p-0 max-h-[90vh] overflow-hidden flex flex-col gap-0">
          {loading || !detail ? (
            <div className="p-8">
              <LoadingState label="Loading case…" />
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg border flex items-center justify-center',
                      detail.case.priority === 'URGENT'
                        ? 'border-red-500/25 bg-red-500/10 text-red-300'
                        : detail.case.priority === 'HIGH'
                        ? 'border-amber-500/25 bg-amber-500/10 text-amber-300'
                        : 'border-white/[0.08] bg-white/[0.04] text-white/70'
                    )}
                  >
                    <AlertCircle className="w-5 h-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="label-mono text-white/50">Moderation case</p>
                    <p className="mt-0.5 text-[15px] font-semibold text-white capitalize">
                      {detail.case.target_type} · {detail.case.status.replace('_', ' ').toLowerCase()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full text-white/50 hover:text-white hover:bg-white/[0.06] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {detail.case.target_author && (
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 flex items-center gap-3">
                    <Avatar className="w-9 h-9 border border-white/[0.06]">
                      <AvatarImage src={detail.case.target_author.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[11px] bg-white/[0.06]">
                        {(detail.case.target_author.full_name || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-white flex items-center gap-1">
                        {detail.case.target_author.full_name}
                        {detail.case.target_author.is_verified && (
                          <ShieldCheck className="w-3 h-3 text-white/60" strokeWidth={1.75} />
                        )}
                      </p>
                      <p className="text-[11px] text-white/45">@{detail.case.target_author.username}</p>
                    </div>
                  </div>
                )}

                {/* Reports */}
                <section>
                  <p className="label-mono text-white/50 mb-2">Reports ({detail.reports.length})</p>
                  <ul className="space-y-2">
                    {detail.reports.map((r: any) => (
                      <li key={r.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar className="w-6 h-6 border border-white/[0.06]">
                            <AvatarImage src={r.reporter?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-white/[0.06]">
                              {(r.reporter?.full_name || '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-[12px] text-white/85 min-w-0 truncate">
                            <span className="font-medium">{r.reporter?.full_name || 'Anonymous'}</span>
                            <span className="text-white/40">
                              {' · '}
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </span>
                          </p>
                          <span className="ml-auto text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/[0.06] bg-white/[0.02] text-white/60">
                            {r.reason.replace('_', ' ').toLowerCase()}
                          </span>
                        </div>
                        {r.description && (
                          <p className="text-[12.5px] text-white/70 whitespace-pre-wrap leading-relaxed">
                            {r.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>

                {/* Evidence */}
                {detail.evidence.length > 0 && (
                  <section>
                    <p className="label-mono text-white/50 mb-2">Evidence snapshot</p>
                    {detail.evidence.map((e: any) => (
                      <div key={e.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                        <p className="text-[10.5px] font-mono uppercase tracking-wider text-white/40 mb-2">
                          {e.evidence_type} · captured{' '}
                          {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                        </p>
                        {e.content_snapshot && (
                          <pre className="text-[12px] text-white/70 whitespace-pre-wrap font-sans leading-relaxed">
                            {e.content_snapshot}
                          </pre>
                        )}
                      </div>
                    ))}
                  </section>
                )}

                {/* Actions timeline */}
                {detail.actions.length > 0 && (
                  <section>
                    <p className="label-mono text-white/50 mb-2">Action history</p>
                    <ul className="space-y-2">
                      {detail.actions.map((a: any) => (
                        <li
                          key={a.id}
                          className="flex items-start gap-2 rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5"
                        >
                          <Avatar className="w-6 h-6 border border-white/[0.06]">
                            <AvatarImage src={a.actor?.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[9px] bg-white/[0.06]">
                              {(a.actor?.full_name || '?').charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] text-white/85 leading-tight">
                              <span className="font-medium">{a.actor?.full_name || 'Moderator'}</span>
                              <span className="text-white/50"> took action: </span>
                              <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/70">
                                {a.action_type.replace('_', ' ').toLowerCase()}
                              </span>
                            </p>
                            {a.reason && <p className="mt-1 text-[11.5px] text-white/60">{a.reason}</p>}
                            <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-white/35">
                              {format(new Date(a.created_at), 'MMM d · h:mm a')}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              {(detail.case.status === 'OPEN' || detail.case.status === 'UNDER_REVIEW') ? (
                <div className="border-t border-white/[0.06] p-5 space-y-3 flex-shrink-0 bg-white/[0.02]">
                  <p className="label-mono text-white/50">Take action</p>
                  <div className="grid gap-2 grid-cols-2">
                    {ACTIONS.map((a) => (
                      <button
                        key={a.key}
                        onClick={() => openTake(a)}
                        disabled={pending}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-colors',
                          a.tone === 'danger'
                            ? 'border-red-500/20 bg-red-500/[0.03] text-red-200 hover:bg-red-500/[0.08]'
                            : 'border-white/[0.08] bg-white/[0.02] text-white/80 hover:bg-white/[0.06] hover:text-white'
                        )}
                      >
                        {pending && activeAction?.kind === 'take' && activeAction.actionKey === a.key ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <a.icon className="w-3 h-3" strokeWidth={1.75} />
                        )}
                        {a.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={openDismiss}
                    disabled={pending}
                    className="w-full text-[12px] text-white/50 hover:text-white transition-colors py-2 border-t border-white/[0.04] mt-2"
                  >
                    Dismiss case (no action)
                  </button>
                </div>
              ) : (
                <div className="border-t border-white/[0.06] p-4 text-center text-[12px] text-white/45">
                  Case {detail.case.status.toLowerCase()} — no further actions available.
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reason prompt overlays */}
      {activeAction?.kind === 'take' && (
        <ReasonPromptDialog
          open
          onOpenChange={(v) => !v && closeAction()}
          title={activeAction.actionLabel}
          description="Add an optional reason. This is sent to the affected member and recorded in the audit log."
          placeholder="Reason (optional)…"
          submitLabel={activeAction.actionLabel}
          destructive={activeAction.destructive}
          loading={pending}
          onSubmit={submitTakeAction}
        />
      )}
      {activeAction?.kind === 'dismiss' && (
        <ReasonPromptDialog
          open
          onOpenChange={(v) => !v && closeAction()}
          title="Dismiss this case"
          description="Optional note explaining why no action was taken. Recorded in the audit log."
          placeholder="Reason for dismissal…"
          submitLabel="Dismiss case"
          loading={pending}
          onSubmit={submitDismiss}
        />
      )}
    </>
  )
}