'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Envelope,
  ArrowClockwise,
  CheckSquare,
  Square,
  Archive,
  Trash,
  EnvelopeOpen,
  X,
  DotsThree,
  CaretLeft,
  CaretRight,
  Warning,
  Clock,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { ThreadRow } from './ThreadRow'
import { useMailIdentity, useOnIdentityChange } from './hooks/useMailIdentity'
import { MailTab } from './MailTabs'
import { MailFilters } from './AdvancedFilterBar'
import { SnoozeModal } from './reading/SnoozeModal'
import { useMailRealtime } from './hooks/useMailRealtime'
import { mailToast } from '@/lib/mail/toastBus'
import { emitMailRefresh } from '@/lib/mail/mailEvents'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DsrtEmpty, DsrtButton, DsrtSkeleton } from '@/components/dsrt'

interface Props {
  activeFolder: string
  activeTab: MailTab
  searchQ: string
  filters: MailFilters
  selectedThreadId: string | null
  onSelectThread: (id: string) => void
}

const PAGE_SIZE = 50

const FOLDER_META: Record<
  string,
  { title: string; emptyTitle: string; emptyDesc: string }
> = {
  inbox: {
    title: 'Inbox',
    emptyTitle: 'Inbox zero',
    emptyDesc: 'No new messages here.',
  },
  starred: {
    title: 'Starred',
    emptyTitle: 'No starred messages',
    emptyDesc: 'Star important messages to find them here.',
  },
  snoozed: {
    title: 'Snoozed',
    emptyTitle: 'Nothing snoozed',
    emptyDesc: 'Snoozed conversations return to your inbox automatically.',
  },
  sent: {
    title: 'Sent',
    emptyTitle: 'No sent messages',
    emptyDesc: 'Messages you send will appear here.',
  },
  drafts: {
    title: 'Drafts',
    emptyTitle: 'No drafts',
    emptyDesc: 'Unfinished messages are saved automatically.',
  },
  scheduled: {
    title: 'Scheduled',
    emptyTitle: 'Nothing scheduled',
    emptyDesc: 'Compose a message and choose a future time.',
  },
  archive: {
    title: 'Archive',
    emptyTitle: 'Archive empty',
    emptyDesc: 'Archived conversations appear here.',
  },
  all: {
    title: 'All Mail',
    emptyTitle: 'No mail yet',
    emptyDesc: 'Your messages will appear here.',
  },
  spam: {
    title: 'Spam',
    emptyTitle: 'No spam',
    emptyDesc: 'Suspicious messages are filtered here.',
  },
  trash: {
    title: 'Trash',
    emptyTitle: 'Trash is empty',
    emptyDesc: 'Deleted messages appear here.',
  },
  important: {
    title: 'Important',
    emptyTitle: 'Nothing marked important',
    emptyDesc: 'Priority messages will appear here.',
  },
  action_required: {
    title: 'Action Required',
    emptyTitle: 'All caught up',
    emptyDesc: 'No pending actions right now.',
  },
  awaiting_reply: {
    title: 'Awaiting Reply',
    emptyTitle: 'No pending replies',
    emptyDesc: 'Messages you sent awaiting response.',
  },
  unread: {
    title: 'Unread',
    emptyTitle: 'All read',
    emptyDesc: 'You have no unread messages.',
  },
  with_attachments: {
    title: 'With Attachments',
    emptyTitle: 'No attachments',
    emptyDesc: 'Messages with files will appear here.',
  },
  shared_with_me: {
    title: 'Shared With Me',
    emptyTitle: 'Nothing shared',
    emptyDesc: 'Messages sent to you will appear here.',
  },
}

export function ThreadList({
  activeFolder,
  activeTab,
  searchQ,
  filters,
  selectedThreadId,
  onSelectThread,
}: Props) {
  const router = useRouter()
  const { activeIdentity, isUnified, loading: identityLoading } =
    useMailIdentity()
  const [threads, setThreads] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [snoozeThread, setSnoozeThread] = useState<any | null>(null)
  const [bulkSnoozeOpen, setBulkSnoozeOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const isDraftFolder = activeFolder === 'drafts'
  const isScheduledFolder = activeFolder === 'scheduled'
  const isSnoozedFolder = activeFolder === 'snoozed'
  const isDraftLike = isDraftFolder || isScheduledFolder

  useEffect(() => {
    setPage(0)
    setChecked(new Set())
  }, [activeFolder, activeTab, searchQ, JSON.stringify(filters)])

  const fetchThreads = useCallback(
    async (isRefresh = false) => {
      if (identityLoading) return
      if (!activeIdentity && !isUnified) {
        setLoading(false)
        return
      }

      if (abortRef.current) abortRef.current.abort()
      abortRef.current = new AbortController()

      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const identityId = isUnified
          ? 'unified'
          : typeof activeIdentity === 'object' && activeIdentity
            ? activeIdentity.identity_id
            : 'unified'

        const params = new URLSearchParams({
          identity_id: identityId,
          folder: activeFolder,
          limit: String(PAGE_SIZE),
          offset: String(page * PAGE_SIZE),
        })
        if (activeTab) params.append('tab', activeTab)
        if (searchQ) params.append('q', searchQ)
        if (filters.hasAttachment) params.append('has_attachment', '1')
        if (filters.isUnread) params.append('unread_only', '1')
        if (filters.isStarred) params.append('starred_only', '1')
        if (filters.fromType !== 'all') params.append('from_type', filters.fromType)
        if (filters.dateRange !== 'all')
          params.append('date_range', filters.dateRange)

        const res = await fetch(`/api/mail/threads?${params}`, {
          signal: abortRef.current.signal,
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load')

        setThreads(data.threads || [])
        setTotal(data.total || 0)
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error(e)
          setError(e.message || 'Failed to load mail')
          if (!isRefresh) mailToast.error('Failed to load mail')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [
      activeIdentity,
      isUnified,
      identityLoading,
      activeFolder,
      activeTab,
      searchQ,
      filters,
      page,
    ]
  )

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  useOnIdentityChange(() => {
    setChecked(new Set())
    setPage(0)
    fetchThreads(true)
  })

  const refreshList = useCallback(() => {
    fetchThreads(true)
  }, [fetchThreads])

  useMailRealtime({
    channelKey: `${activeFolder}_${page}_${activeTab}`,
    enabled: !identityLoading,
    debounceMs: 400,
    onRefresh: refreshList,
  })

  const deleteDrafts = async (ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/mail/drafts/${id}`, { method: 'DELETE' }))
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed) mailToast.error(`Failed to delete ${failed} draft(s)`)
    else
      mailToast.success(
        ids.length === 1 ? 'Draft deleted' : `${ids.length} drafts deleted`
      )
    emitMailRefresh()
  }

  const patchThreadState = async (
    threadId: string,
    updates: Record<string, any>,
    successMsg?: string
  ) => {
    const prev = threads

    setThreads((list) => {
      const shouldRemove =
        (updates.is_archived === true && activeFolder === 'inbox') ||
        updates.is_trashed === true ||
        (updates.snooze_until && activeFolder === 'inbox') ||
        (updates.is_snoozed === false && activeFolder === 'snoozed') ||
        (updates.is_archived === false && activeFolder === 'archive')

      if (shouldRemove) return list.filter((t) => t.id !== threadId)
      return list.map((t) =>
        t.id === threadId
          ? {
              ...t,
              participant_state: { ...t.participant_state, ...updates },
            }
          : t
      )
    })

    try {
      const res = await fetch(`/api/mail/threads/${threadId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Action failed')
      }
      if (successMsg) mailToast.success(successMsg)
      emitMailRefresh()
    } catch (e: any) {
      setThreads(prev)
      mailToast.error(e.message || 'Action failed')
    }
  }

  const snoozeThreadNow = async (threadId: string, until: Date) => {
    const prev = threads
    setThreads((list) => list.filter((t) => t.id !== threadId))
    try {
      const res = await fetch(`/api/mail/threads/${threadId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snooze_until: until.toISOString() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Snooze failed')
      }
      mailToast.success(`Snoozed until ${until.toLocaleString()}`)
      emitMailRefresh()
    } catch (e: any) {
      setThreads(prev)
      mailToast.error(e.message || 'Snooze failed')
    }
  }

  const unsnoozeThread = async (thread: any) => {
    const prev = threads
    setThreads((list) => list.filter((t) => t.id !== thread.id))
    try {
      const res = await fetch(`/api/mail/threads/${thread.id}/snooze`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Unsnooze failed')
      }
      mailToast.success('Moved back to inbox')
      emitMailRefresh()
    } catch (e: any) {
      setThreads(prev)
      mailToast.error(e.message || 'Unsnooze failed')
    }
  }

  const unscheduleDraft = async (thread: any) => {
    const prev = threads
    setThreads((list) => list.filter((t) => t.id !== thread.id))
    try {
      const res = await fetch(`/api/mail/drafts/${thread.id}/unschedule`, {
        method: 'POST',
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed')
      }
      const detailRes = await fetch(`/api/mail/drafts/${thread.id}/detail`)
      const detailData = await detailRes.json()
      if (detailRes.ok && detailData.draft) {
        window.dispatchEvent(
          new CustomEvent('mail:open_draft', { detail: detailData.draft })
        )
      }
      mailToast.success('Schedule cancelled — draft opened for editing')
      emitMailRefresh()
    } catch (e: any) {
      setThreads(prev)
      mailToast.error(e.message || 'Failed')
    }
  }

  const handleBulkAction = async (updates: any, msg: string) => {
    if (checked.size === 0) return
    const ids = Array.from(checked)
    const prev = threads

    if (isDraftLike) {
      if (updates.is_trashed || updates.delete) {
        setThreads((list) => list.filter((t) => !ids.includes(t.id)))
        setChecked(new Set())
        await deleteDrafts(ids)
      } else {
        mailToast.message('Only delete is available for drafts.')
      }
      return
    }

    setThreads((list) => list.filter((t) => !ids.includes(t.id)))
    setChecked(new Set())
    try {
      const res = await fetch('/api/mail/threads/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_ids: ids, updates }),
      })
      if (!res.ok) throw new Error()
      mailToast.success(msg)
      emitMailRefresh()
    } catch {
      setThreads(prev)
      mailToast.error('Action failed')
    }
  }

  const confirmBulkSnooze = async (until: Date) => {
    const ids = Array.from(checked)
    setBulkSnoozeOpen(false)
    if (!ids.length) return
    const prev = threads
    setThreads((list) => list.filter((t) => !ids.includes(t.id)))
    setChecked(new Set())
    try {
      const res = await fetch('/api/mail/threads/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_ids: ids,
          updates: { snooze_until: until.toISOString() },
        }),
      })
      if (!res.ok) throw new Error()
      mailToast.success(`${ids.length} snoozed until ${until.toLocaleString()}`)
      emitMailRefresh()
    } catch {
      setThreads(prev)
      mailToast.error('Snooze failed')
    }
  }

  const handleStar = async (threadId: string, starred: boolean) => {
    if (isDraftLike) return
    await patchThreadState(threadId, { is_starred: starred })
  }

  const handleArchive = async (thread: any) => {
    if (isDraftLike || thread.is_draft) {
      mailToast.message('Drafts cannot be archived.')
      return
    }
    await patchThreadState(thread.id, { is_archived: true }, 'Archived')
  }

  const handleDelete = async (thread: any) => {
    if (isDraftLike || thread.is_draft || thread.is_scheduled) {
      const prev = threads
      setThreads((list) => list.filter((t) => t.id !== thread.id))
      try {
        await deleteDrafts([thread.id])
      } catch {
        setThreads(prev)
      }
      return
    }
    await patchThreadState(thread.id, { is_trashed: true }, 'Moved to trash')
  }

  const handleMarkUnread = async (thread: any) => {
    if (isDraftLike || thread.is_draft) return
    await patchThreadState(thread.id, { is_read: false }, 'Marked unread')
  }

  const handleSnooze = (thread: any) => {
    if (isDraftLike || thread.is_draft) return
    setSnoozeThread(thread)
  }

  const confirmSnooze = async (until: Date) => {
    if (!snoozeThread) return
    const id = snoozeThread.id
    setSnoozeThread(null)
    await snoozeThreadNow(id, until)
  }

  const handleThreadClick = async (thread: any) => {
    if (
      isDraftFolder ||
      isScheduledFolder ||
      thread.is_draft ||
      thread.is_scheduled
    ) {
      mailToast.message('Loading draft...')
      try {
        const res = await fetch(`/api/mail/drafts/${thread.id}/detail`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load draft')
        window.dispatchEvent(
          new CustomEvent('mail:open_draft', { detail: data.draft })
        )
      } catch (err: any) {
        mailToast.error(err.message || 'Failed to load draft')
      }
    } else {
      onSelectThread(thread.id)
      router.push(`/inbox/${thread.id}`)
    }
  }

  const toggleCheck = (threadId: string, isChecked: boolean) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (isChecked) next.add(threadId)
      else next.delete(threadId)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (checked.size === threads.length) setChecked(new Set())
    else setChecked(new Set(threads.map((t) => t.id)))
  }

  const handleMarkAllRead = async () => {
    const unreadIds = threads
      .filter((t) => !t.participant_state?.is_read)
      .map((t) => t.id)
    if (!unreadIds.length) return
    try {
      const res = await fetch('/api/mail/threads/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_ids: unreadIds,
          updates: { is_read: true },
        }),
      })
      if (!res.ok) throw new Error()
      mailToast.success('Marked all as read')
      emitMailRefresh()
      fetchThreads(true)
    } catch {
      mailToast.error('Action failed')
    }
  }

  const unreadCount = threads.filter(
    (t) => !t.participant_state?.is_read
  ).length
  const meta = FOLDER_META[activeFolder] || FOLDER_META.inbox
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const startIdx = total === 0 ? 0 : page * PAGE_SIZE + 1
  const endIdx = Math.min((page + 1) * PAGE_SIZE, total)

  return (
    <section className="flex-1 w-full bg-[#05070D] flex flex-col min-h-0">
      {checked.size > 0 ? (
        <div className="h-11 border-b border-white/[0.06] bg-[#1e3a5f]/20 flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setChecked(new Set())}
              className="text-white/70 hover:text-white"
              title="Deselect"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
            <span className="text-[11.5px] font-bold text-white">
              {checked.size} selected
            </span>
          </div>
          <div className="flex items-center gap-0.5">
            {!isDraftLike && !isSnoozedFolder && (
              <button
                onClick={() =>
                  handleBulkAction({ is_archived: true }, 'Archived')
                }
                className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center"
                title="Archive"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() =>
                handleBulkAction({ is_trashed: true, delete: true }, 'Deleted')
              }
              className="w-8 h-8 rounded-lg hover:bg-red-500/15 text-white/70 hover:text-red-400 flex items-center justify-center"
              title="Delete"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>
            {!isDraftLike && !isSnoozedFolder && (
              <>
                <div className="w-px h-4 bg-white/[0.1] mx-1" />
                <button
                  onClick={() =>
                    handleBulkAction({ is_read: true }, 'Marked as read')
                  }
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center"
                  title="Mark read"
                >
                  <EnvelopeOpen className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() =>
                    handleBulkAction({ is_read: false }, 'Marked as unread')
                  }
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center"
                  title="Mark unread"
                >
                  <Envelope className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-white/[0.1] mx-1" />
                <button
                  onClick={() => setBulkSnoozeOpen(true)}
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center"
                  title="Snooze"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            {isSnoozedFolder && (
              <button
                onClick={() =>
                  handleBulkAction({ is_snoozed: false }, 'Unsnoozed')
                }
                className="w-8 h-8 rounded-lg hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center"
                title="Unsnooze"
              >
                <ArrowClockwise className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="h-11 border-b border-white/[0.06] flex items-center justify-between px-3 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={toggleSelectAll}
              className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center shrink-0"
              title="Select all"
            >
              {threads.length > 0 && checked.size === threads.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-white" weight="fill" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
            </button>
            <div className="flex flex-col leading-tight min-w-0">
              <p className="text-[12.5px] font-semibold text-white truncate">{meta.title}</p>
              {unreadCount > 0 && !isDraftLike && (
                <span className="text-[10px] text-white/40 font-mono">
                  {unreadCount} unread
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            {total > 0 && (
              <div className="hidden sm:flex items-center gap-1 mr-2">
                <span className="text-[10.5px] text-white/40 font-mono">
                  {startIdx}–{endIdx} of {total}
                </span>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="w-7 h-7 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center disabled:opacity-30"
                >
                  <CaretLeft className="w-3 h-3" weight="bold" />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="w-7 h-7 rounded-lg hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center disabled:opacity-30"
                >
                  <CaretRight className="w-3 h-3" weight="bold" />
                </button>
              </div>
            )}
            <button
              onClick={() => fetchThreads(true)}
              disabled={refreshing}
              className={cn(
                'w-8 h-8 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center',
                refreshing && 'text-white/70'
              )}
              title="Refresh"
            >
              <ArrowClockwise
                className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')}
              />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white flex items-center justify-center"
                  title="More"
                >
                  <DotsThree className="w-4 h-4" weight="bold" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 bg-[#0a0f1a] border-white/[0.08] text-white rounded-xl shadow-2xl"
              >
                <DropdownMenuItem
                  onClick={() => fetchThreads(true)}
                  className="cursor-pointer focus:bg-white/[0.06] text-[13px]"
                >
                  Refresh list
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={toggleSelectAll}
                  className="cursor-pointer focus:bg-white/[0.06] text-[13px]"
                >
                  {checked.size === threads.length
                    ? 'Deselect all'
                    : 'Select all'}
                </DropdownMenuItem>
                {!isDraftLike && unreadCount > 0 && (
                  <DropdownMenuItem
                    onClick={handleMarkAllRead}
                    className="cursor-pointer focus:bg-white/[0.06] text-[13px]"
                  >
                    Mark all as read
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading || identityLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <DsrtSkeleton key={i} className="h-[72px] rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <DsrtEmpty
            icon={Warning}
            title="Something went wrong"
            description={error}
            action={
              <DsrtButton variant="outline" size="sm" onClick={() => fetchThreads(true)}>
                Try again
              </DsrtButton>
            }
          />
        ) : threads.length === 0 ? (
          <DsrtEmpty
            icon={Envelope}
            title={searchQ ? 'No results' : meta.emptyTitle}
            description={searchQ ? `No messages match "${searchQ}"` : meta.emptyDesc}
          />
        ) : (
          <div>
            {threads.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                activeFolder={activeFolder}
                isSelected={selectedThreadId === t.id}
                isChecked={checked.has(t.id)}
                onClick={() => handleThreadClick(t)}
                onCheck={(c) => toggleCheck(t.id, c)}
                onStar={(s) => handleStar(t.id, s)}
                onArchive={handleArchive}
                onDelete={handleDelete}
                onMarkUnread={handleMarkUnread}
                onSnooze={handleSnooze}
                onUnsnooze={unsnoozeThread}
                onUnschedule={unscheduleDraft}
              />
            ))}
          </div>
        )}
      </div>

      {/* Mobile pagination */}
      {total > PAGE_SIZE && (
        <div className="sm:hidden flex items-center justify-between px-3 py-2 border-t border-white/[0.06]">
          <DsrtButton
            size="xs"
            variant="ghost"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <CaretLeft size={12} /> Prev
          </DsrtButton>
          <span className="text-[10px] font-mono text-white/40">
            {startIdx}–{endIdx} of {total}
          </span>
          <DsrtButton
            size="xs"
            variant="ghost"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next <CaretRight size={12} />
          </DsrtButton>
        </div>
      )}

      <SnoozeModal
        open={!!snoozeThread}
        onClose={() => setSnoozeThread(null)}
        onSnooze={confirmSnooze}
      />
      <SnoozeModal
        open={bulkSnoozeOpen}
        title={`Snooze ${checked.size} conversation${checked.size === 1 ? '' : 's'}`}
        onClose={() => setBulkSnoozeOpen(false)}
        onSnooze={confirmBulkSnooze}
      />
    </section>
  )
}