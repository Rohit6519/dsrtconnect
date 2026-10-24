'use client'

import { useState, useEffect, useCallback } from 'react'
import { Envelope, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useComposer } from './composer/ComposerContext'
import { ThreadHeader } from './reading/ThreadHeader'
import { MessageCard } from './reading/MessageCard'
import { QuickReplyBar } from './reading/QuickReplyBar'
import { ActionPipelineBanner } from './reading/ActionPipelineBanner'
import { SourceEntityCard } from './reading/SourceEntityCard'
import { SnoozeModal } from './reading/SnoozeModal'
import { DsrtEmpty, DsrtButton, DsrtSkeleton } from '@/components/dsrt'

interface Props {
  threadId: string | null
  onToggleContext: () => void
  onDeselect: () => void
}

export function ReadingPane({ threadId, onToggleContext, onDeselect }: Props) {
  const { openCompose } = useComposer()
  const [thread, setThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [sourceEntity, setSourceEntity] = useState<any>(null)
  const [smartReplyIdentityId, setSmartReplyIdentityId] = useState<string | null>(null)
  const [attachmentsCount, setAttachmentsCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [activeReplyMode, setActiveReplyMode] = useState<'reply' | 'reply_all' | 'forward' | null>(null)

  const loadThread = useCallback(async () => {
    if (!threadId) {
      setThread(null)
      setMessages([])
      setParticipants([])
      setSourceEntity(null)
      setSmartReplyIdentityId(null)
      setAttachmentsCount(0)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/mail/threads/${threadId}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load thread')

      setThread(data.thread)
      setMessages(Array.isArray(data.messages) ? data.messages : [])
      setParticipants(Array.isArray(data.participants) ? data.participants : [])
      setSourceEntity(data.source_entity || null)
      setSmartReplyIdentityId(data.smart_reply_identity_id || null)
      setAttachmentsCount(data.attachments_count || 0)
    } catch (e: any) {
      setError(e.message || 'Failed to load thread')
      toast.error(e.message || 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => {
    loadThread()
  }, [loadThread])

  useEffect(() => {
    setActiveReplyMode(null)
  }, [threadId])

  useEffect(() => {
    const handler = () => loadThread()
    window.addEventListener('mail:thread:refresh', handler)
    return () => window.removeEventListener('mail:thread:refresh', handler)
  }, [loadThread])

  const updateThreadState = async (updates: any, msg: string) => {
    if (!threadId) return
    try {
      const res = await fetch(`/api/mail/threads/${threadId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      toast.success(msg)
      window.dispatchEvent(new Event('mail:refresh'))
      window.dispatchEvent(new Event('mail:counts:refresh'))
    } catch {
      toast.error('Action failed')
    }
  }

  const handleArchive = async () => {
    await updateThreadState({ is_archived: true }, 'Archived')
    onDeselect()
  }

  const handleTrash = async () => {
    await updateThreadState({ is_trashed: true }, 'Moved to trash')
    onDeselect()
  }

  const handleStar = async () => {
    const currentStarred = thread?.participant_state?.is_starred
    setThread((t: any) =>
      t
        ? {
            ...t,
            participant_state: {
              ...t.participant_state,
              is_starred: !currentStarred,
            },
          }
        : t
    )
    await updateThreadState(
      { is_starred: !currentStarred },
      !currentStarred ? 'Starred' : 'Unstarred'
    )
  }

  const handleMarkUnread = async () => {
    await updateThreadState({ is_read: false }, 'Marked as unread')
    onDeselect()
  }

  const handleSnooze = async (until: Date) => {
    await updateThreadState(
      {
        is_snoozed: true,
        snooze_until: until.toISOString(),
      },
      `Snoozed until ${until.toLocaleString()}`
    )
    setSnoozeOpen(false)
    onDeselect()
  }

  const handleReplyInComposer = (mode: 'reply' | 'reply_all' | 'forward') => {
    if (!thread || messages.length === 0) {
      toast.error('No messages loaded yet — cannot reply/forward')
      return
    }

    const lastMessage = messages[messages.length - 1]
    const sender = lastMessage.sender_identity

    let subject = thread.subject || ''
    if (mode === 'reply' || mode === 'reply_all') {
      if (!subject.toLowerCase().startsWith('re:')) subject = `Re: ${subject}`
    } else if (mode === 'forward') {
      if (!subject.toLowerCase().startsWith('fwd:')) subject = `Fwd: ${subject}`
    }

    let to: any[] = []
    let cc: any[] = []

    if (mode === 'reply') {
      if (sender && sender.id !== smartReplyIdentityId) {
        to = [
          {
            identity_id: sender.id,
            entity_type: sender.entity_type,
            entity_id: sender.entity_id,
            dsrt_email: sender.dsrt_email,
            display_name: sender.display_name,
            avatar_url: sender.avatar_url,
          },
        ]
      } else {
        const other = participants.find(
          (p) => p.identity && p.identity.id !== smartReplyIdentityId
        )
        if (other?.identity) {
          to = [
            {
              identity_id: other.identity.id,
              entity_type: other.identity.entity_type,
              entity_id: other.identity.entity_id,
              dsrt_email: other.identity.dsrt_email,
              display_name: other.identity.display_name,
              avatar_url: other.identity.avatar_url,
            },
          ]
        }
      }
    } else if (mode === 'reply_all') {
      const uniqueParts = Array.from(
        new Map(
          participants
            .filter((p) => p.identity && p.identity.id !== smartReplyIdentityId)
            .map((p) => [p.identity_id, p])
        ).values()
      )

      to = uniqueParts
        .filter((p) => p.role === 'to' || p.role === 'from')
        .map((p) => ({
          identity_id: p.identity.id,
          entity_type: p.identity.entity_type,
          entity_id: p.identity.entity_id,
          dsrt_email: p.identity.dsrt_email,
          display_name: p.identity.display_name,
          avatar_url: p.identity.avatar_url,
        }))

      cc = uniqueParts
        .filter((p) => p.role === 'cc')
        .map((p) => ({
          identity_id: p.identity.id,
          entity_type: p.identity.entity_type,
          entity_id: p.identity.entity_id,
          dsrt_email: p.identity.dsrt_email,
          display_name: p.identity.display_name,
          avatar_url: p.identity.avatar_url,
        }))

      if (to.length === 0 && uniqueParts.length > 0) {
        to = uniqueParts.map((p) => ({
          identity_id: p.identity.id,
          entity_type: p.identity.entity_type,
          entity_id: p.identity.entity_id,
          dsrt_email: p.identity.dsrt_email,
          display_name: p.identity.display_name,
          avatar_url: p.identity.avatar_url,
        }))
        cc = []
      }
    }

    let quotedBody = ''
    if (mode === 'forward') {
      const rawBody = lastMessage.body_html || lastMessage.body_text || ''
      quotedBody = `<br/><br/><blockquote style="border-left:3px solid rgba(255,255,255,0.15);padding-left:12px;margin:12px 0;color:rgba(255,255,255,0.6);">
--- Forwarded message ---<br/>
From: ${sender?.display_name || 'Unknown'} &lt;${sender?.dsrt_email || ''}&gt;<br/>
Date: ${new Date(lastMessage.sent_at).toLocaleString()}<br/>
Subject: ${thread.subject || ''}<br/><br/>
${rawBody}
</blockquote>`
    } else if (mode === 'reply' || mode === 'reply_all') {
      const rawBody = lastMessage.body_html || lastMessage.body_text || ''
      if (rawBody) {
        quotedBody = `<br/><br/><blockquote style="border-left:3px solid rgba(255,255,255,0.15);padding-left:12px;margin:12px 0;color:rgba(255,255,255,0.55);">
On ${new Date(lastMessage.sent_at).toLocaleString()}, ${sender?.display_name || 'Unknown'} wrote:<br/>
${rawBody}
</blockquote>`
      }
    }

    openCompose({
      mode,
      from_identity_id: smartReplyIdentityId || undefined,
      to,
      cc,
      subject,
      body_html: quotedBody,
      reply_to_thread_id: mode === 'forward' ? undefined : threadId!,
      reply_to_message_id: mode === 'forward' ? undefined : lastMessage.id,
    })
  }

  if (!threadId) {
    return (
      <main className="flex-1 bg-[#05070D] flex flex-col items-center justify-center text-center p-6">
        <DsrtEmpty
          icon={Envelope}
          title="Select a conversation"
          description="Choose a thread from the list to read its messages."
        />
      </main>
    )
  }

  if (loading) {
    return (
      <main className="flex-1 bg-[#05070D] flex flex-col overflow-hidden p-4 space-y-4">
        <DsrtSkeleton className="h-12 w-full rounded-xl" />
        <DsrtSkeleton className="h-8 w-2/3 rounded-lg" />
        <DsrtSkeleton className="h-32 w-full rounded-xl" />
        <DsrtSkeleton className="h-32 w-full rounded-xl" />
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex-1 bg-[#05070D] flex flex-col items-center justify-center p-6">
        <DsrtEmpty
          icon={Warning}
          title="Couldn't load thread"
          description={error}
          action={
            <DsrtButton variant="outline" size="sm" onClick={loadThread}>
              Try again
            </DsrtButton>
          }
        />
      </main>
    )
  }

  if (!thread) return null

  const showActionBanner =
    thread.source_type &&
    ['connect', 'application', 'venture_invite', 'project_invite'].includes(
      thread.source_type
    )

  return (
    <>
      <main className="flex-1 bg-[#05070D] flex flex-col overflow-hidden min-w-0">
        <ThreadHeader
          thread={thread}
          participants={participants}
          attachmentsCount={attachmentsCount}
          onArchive={handleArchive}
          onTrash={handleTrash}
          onStar={handleStar}
          onMarkUnread={handleMarkUnread}
          onSnooze={() => setSnoozeOpen(true)}
          onToggleContext={onToggleContext}
        />

        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4 sm:py-5">
          {sourceEntity && (
            <SourceEntityCard
              entityType={thread.source_entity_type}
              entity={sourceEntity}
            />
          )}

          {showActionBanner && (
            <div className="mt-4">
              <ActionPipelineBanner
                threadId={thread.id}
                sourceType={thread.source_type}
                actionState={thread.action_state}
                onActionComplete={() => {
                  loadThread()
                  window.dispatchEvent(new Event('mail:refresh'))
                }}
              />
            </div>
          )}

          <div className="mt-5 space-y-4">
            {messages.length === 0 ? (
              <DsrtEmpty
                title="No messages loaded"
                description="Thread header is visible, but messages returned empty. Try reloading."
                action={
                  <DsrtButton variant="outline" size="sm" onClick={loadThread}>
                    Retry load
                  </DsrtButton>
                }
              />
            ) : (
              messages.map((m, i) => (
                <MessageCard
                  key={m.id}
                  message={m}
                  isFirst={i === 0}
                  isLast={i === messages.length - 1}
                  onReply={() => setActiveReplyMode('reply')}
                  onReplyAll={() => handleReplyInComposer('reply_all')}
                  onForward={() => handleReplyInComposer('forward')}
                />
              ))
            )}
          </div>
        </div>

        <div className="pb-[env(safe-area-inset-bottom)]">
          <QuickReplyBar
            threadId={thread.id}
            smartReplyIdentityId={smartReplyIdentityId}
            activeMode={activeReplyMode}
            setActiveMode={setActiveReplyMode}
            onReplySent={() => {
              loadThread()
              window.dispatchEvent(new Event('mail:refresh'))
            }}
            onExpandToFull={handleReplyInComposer}
          />
        </div>
      </main>

      <SnoozeModal
        open={snoozeOpen}
        onClose={() => setSnoozeOpen(false)}
        onSnooze={handleSnooze}
      />
    </>
  )
}