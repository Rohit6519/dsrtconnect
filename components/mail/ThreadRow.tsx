'use client'

import {
  Star, Paperclip, User, Rocket, Buildings,
  Archive, Trash, EnvelopeSimple, Clock, ArrowClockwise
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useMailIdentity } from './hooks/useMailIdentity'
import { DsrtChip } from '@/components/dsrt'

interface Props {
  thread: any
  activeFolder: string
  isSelected: boolean
  isChecked: boolean
  onClick: () => void
  onCheck: (checked: boolean) => void
  onStar: (starred: boolean) => void
  onArchive?: (thread: any) => void
  onDelete?: (thread: any) => void
  onMarkUnread?: (thread: any) => void
  onSnooze?: (thread: any) => void
  onUnsnooze?: (thread: any) => void
  onUnschedule?: (thread: any) => void
}

function formatTime(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
}

function formatWake(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `Today, ${time}`
  if (isTomorrow) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`
}

const ENTITY_ICON = { user: User, venture: Buildings, project: Rocket }

const SOURCE_LABELS: Record<string, string> = {
  connect: 'Connect',
  application: 'Application',
  venture_invite: 'Venture',
  project_invite: 'Project',
  draft: 'Draft',
  scheduled: 'Scheduled',
}

export function ThreadRow({
  thread,
  activeFolder,
  isSelected,
  isChecked,
  onClick,
  onStar,
  onCheck,
  onArchive,
  onDelete,
  onMarkUnread,
  onSnooze,
  onUnsnooze,
  onUnschedule,
}: Props) {
  useMailIdentity()

  const isDraftFolder = activeFolder === 'drafts'
  const isScheduledFolder = activeFolder === 'scheduled'
  const isSnoozedFolder = activeFolder === 'snoozed'
  const isDraftLike = isDraftFolder || isScheduledFolder

  const isUnread = !thread.participant_state?.is_read
  const isStarred = !!thread.participant_state?.is_starred
  const isSnoozed = !!thread.participant_state?.is_snoozed
  const snoozeUntil = thread.participant_state?.snooze_until

  const sender = thread.last_sender_identity
  const SenderIcon = sender ? (ENTITY_ICON[sender.entity_type as keyof typeof ENTITY_ICON] || User) : User
  const sourceLabel = thread.source_type ? SOURCE_LABELS[thread.source_type] : null

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-start gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors border-b border-white/[0.04] relative active:bg-white/[0.03]',
        isSelected ? 'bg-[#1e3a5f]/25' : 'hover:bg-white/[0.02]',
        isUnread && !isSelected && 'bg-white/[0.015]'
      )}
    >
      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#93c5fd]" />}

      <div className="flex flex-col items-center gap-2 pt-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onCheck(!isChecked) }}
          className={cn(
            'w-4 h-4 rounded border transition-colors flex items-center justify-center',
            isChecked ? 'bg-white border-white' : 'border-white/20 hover:border-white/50'
          )}
        >
          {isChecked && <div className="w-2 h-2 bg-black rounded-sm" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onStar(!isStarred) }}
          className={cn(
            'transition-colors',
            isStarred ? 'text-amber-300' : 'text-white/20 hover:text-amber-300/60'
          )}
        >
          <Star className="w-3.5 h-3.5" weight={isStarred ? 'fill' : 'regular'} />
        </button>
      </div>

      <div className="w-9 h-9 rounded-lg overflow-hidden bg-gradient-to-br from-[#1e3a5f] to-[#0f172a] border border-white/[0.08] flex-shrink-0 flex items-center justify-center">
        {sender?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sender.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <SenderIcon className="w-4 h-4 text-white/50" weight="fill" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {isUnread && !isDraftLike && <span className="w-1.5 h-1.5 rounded-full bg-[#93c5fd] flex-shrink-0" />}
            <p className={cn('text-[13px] truncate', isUnread ? 'font-bold text-white' : 'font-semibold text-white/75')}>
              {sender?.display_name || 'Unknown'}
            </p>
            {thread.message_count > 1 && (
              <span className="text-[10.5px] text-white/35 flex-shrink-0 font-mono">{thread.message_count}</span>
            )}
            {isSnoozed && !isSnoozedFolder && (
              <span title="Snoozed" className="flex items-center">
                <Clock className="w-3 h-3 text-white/40 flex-shrink-0" />
              </span>
            )}
          </div>

          <span
            className={cn(
              'text-[10.5px] flex-shrink-0 transition-opacity font-mono',
              isUnread ? 'text-white/70 font-semibold' : 'text-white/40',
              'sm:group-hover:opacity-0'
            )}
          >
            {formatTime(thread.last_message_at)}
          </span>
        </div>

        <p className={cn('text-[12.5px] truncate mb-0.5', isUnread ? 'font-semibold text-white/95' : 'text-white/60')}>
          {thread.subject || '(no subject)'}
        </p>

        <p className="text-[11px] text-white/40 truncate leading-normal">
          {thread.last_message_preview || 'No preview available'}
        </p>

        {(sourceLabel || thread.has_attachments || (isSnoozedFolder && snoozeUntil)) && (
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {isSnoozedFolder && snoozeUntil && (
              <span className="text-[10px] font-medium text-white/70 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> Wakes {formatWake(snoozeUntil)}
              </span>
            )}
            {sourceLabel && (
              <DsrtChip size="sm" tone="neutral">{sourceLabel}</DsrtChip>
            )}
            {thread.has_attachments && (
              <div className="flex items-center gap-1 text-white/40">
                <Paperclip className="w-3 h-3" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover actions — desktop only */}
      <div
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2',
          'hidden sm:group-hover:flex items-center gap-0.5',
          'rounded-lg border border-white/[0.08] bg-[#0a0f1a]/95 backdrop-blur-sm p-0.5 shadow-xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {isSnoozedFolder && (
          <>
            <ActionBtn title="Unsnooze" onClick={() => onUnsnooze?.(thread)}>
              <ArrowClockwise className="w-4 h-4" />
            </ActionBtn>
            <ActionBtn title="Archive" onClick={() => onArchive?.(thread)}>
              <Archive className="w-4 h-4" />
            </ActionBtn>
            <ActionBtn title="Delete" onClick={() => onDelete?.(thread)} danger>
              <Trash className="w-4 h-4" />
            </ActionBtn>
          </>
        )}

        {isScheduledFolder && (
          <>
            <ActionBtn title="Cancel schedule" onClick={() => onUnschedule?.(thread)}>
              <ArrowClockwise className="w-4 h-4" />
            </ActionBtn>
            <ActionBtn title="Delete" onClick={() => onDelete?.(thread)} danger>
              <Trash className="w-4 h-4" />
            </ActionBtn>
          </>
        )}

        {isDraftFolder && (
          <ActionBtn title="Delete draft" onClick={() => onDelete?.(thread)} danger>
            <Trash className="w-4 h-4" />
          </ActionBtn>
        )}

        {!isDraftLike && !isSnoozedFolder && (
          <>
            <ActionBtn title="Archive" onClick={() => onArchive?.(thread)}>
              <Archive className="w-4 h-4" />
            </ActionBtn>
            <ActionBtn title="Delete" onClick={() => onDelete?.(thread)} danger>
              <Trash className="w-4 h-4" />
            </ActionBtn>
            <ActionBtn title="Mark unread" onClick={() => onMarkUnread?.(thread)}>
              <EnvelopeSimple className="w-4 h-4" />
            </ActionBtn>
            <ActionBtn title="Snooze" onClick={() => onSnooze?.(thread)}>
              <Clock className="w-4 h-4" />
            </ActionBtn>
          </>
        )}
      </div>
    </div>
  )
}

function ActionBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode
  onClick?: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => { e.stopPropagation(); onClick?.() }}
      className={cn(
        'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
        danger
          ? 'text-white/55 hover:text-red-400 hover:bg-red-500/10'
          : 'text-white/55 hover:text-white hover:bg-white/[0.08]'
      )}
    >
      {children}
    </button>
  )
}