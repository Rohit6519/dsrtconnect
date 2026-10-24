'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Archive, Trash, Printer, Warning, Star
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useComposer } from './composer/ComposerContext'
import { MessageCard } from './reading/MessageCard'
import { QuickReplyBar } from './reading/QuickReplyBar'
import { DsrtEmpty, DsrtButton, DsrtSkeleton, DsrtChip } from '@/components/dsrt'

interface Props {
  threadId: string
}

export function ThreadDetailPage({ threadId }: Props) {
  const router = useRouter()
  const { openCompose } = useComposer()
  const [thread, setThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [smartReplyIdentityId, setSmartReplyIdentityId] = useState<string | null>(null)
  const [currentUserIdentity, setCurrentUserIdentity] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeReplyMode, setActiveReplyMode] = useState<'reply' | 'reply_all' | 'forward' | null>(null)

  const loadThread = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/mail/threads/${threadId}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load thread')

      setThread(data.thread)
      setMessages(data.messages || [])
      setParticipants(data.participants || [])
      setSmartReplyIdentityId(data.smart_reply_identity_id)
      setCurrentUserIdentity(data.current_user_identity)
    } catch (e: any) {
      setError(e.message || 'Failed to load thread')
    } finally {
      setLoading(false)
    }
  }, [threadId])

  useEffect(() => { loadThread() }, [loadThread])

  const updateThreadState = async (updates: any, msg: string) => {
    try {
      await fetch(`/api/mail/threads/${threadId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      toast.success(msg)
      if (updates.is_archived || updates.is_trashed) router.push('/inbox')
      else loadThread()
    } catch {
      toast.error('Action failed')
    }
  }

  const handleReplyInComposer = (mode: 'reply' | 'reply_all' | 'forward') => {
    if (!thread || messages.length === 0) return
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

    if (mode === 'reply' && sender && sender.id !== smartReplyIdentityId) {
      to = [sender]
    } else if (mode === 'reply_all') {
      const uniqueParts = Array.from(new Map(
        participants.filter(p => p.identity && p.identity.id !== smartReplyIdentityId).map(p => [p.identity_id, p])
      ).values())
      to = uniqueParts.filter(p => p.role === 'to' || p.role === 'from').map(p => p.identity)
      cc = uniqueParts.filter(p => p.role === 'cc').map(p => p.identity)
    }

    let quotedBody = ''
    if (mode === 'forward' || mode === 'reply' || mode === 'reply_all') {
      quotedBody = `<br/><br/><blockquote style="border-left:2px solid rgba(255,255,255,0.2);padding-left:12px;margin:12px 0;color:rgba(255,255,255,0.5);">
On ${new Date(lastMessage.sent_at).toLocaleString()}, ${sender?.display_name || 'Unknown'} wrote:<br/><br/>
${lastMessage.body_html || lastMessage.body_text || ''}
</blockquote>`
    }

    openCompose({
      mode,
      from_identity_id: smartReplyIdentityId || undefined,
      to, cc, subject,
      body_html: quotedBody,
      reply_to_thread_id: mode === 'forward' ? undefined : threadId,
      reply_to_message_id: mode === 'forward' ? undefined : lastMessage.id,
    })
  }

  const isStarred = thread?.participant_state?.is_starred

  return (
    <div className="min-h-[calc(100dvh-64px)] flex flex-col bg-[#05070D] text-white">
      <div className="sticky top-0 z-30 h-12 sm:h-14 px-3 sm:px-6 border-b border-white/[0.06] bg-[#05070D]/95 backdrop-blur-md flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={() => router.push('/inbox')}
            className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg hover:bg-white/[0.06] text-white/80 hover:text-white text-[12px] font-mono uppercase tracking-wider transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Inbox</span>
          </button>

          <div className="w-px h-5 bg-white/[0.1] mx-1 hidden sm:block" />

          <button
            onClick={() => updateThreadState({ is_archived: true }, 'Archived')}
            className="w-9 h-9 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors"
            title="Archive"
          >
            <Archive className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            onClick={() => updateThreadState({ is_trashed: true }, 'Deleted')}
            className="w-9 h-9 rounded-lg hover:bg-red-500/15 text-white/60 hover:text-red-400 flex items-center justify-center transition-colors"
            title="Delete"
          >
            <Trash className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* FIXED: Removed the conflicting Tailwind classes hidden sm:flex */}
        <button
          onClick={() => window.print()}
          className="w-9 h-9 rounded-lg hover:bg-white/[0.08] text-white/60 hover:text-white hidden sm:flex items-center justify-center transition-colors"
          title="Print"
        >
          <Printer className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 md:px-12 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto w-full">
          {loading ? (
            <div className="space-y-4">
              <DsrtSkeleton className="h-8 w-2/3 rounded-lg" />
              <DsrtSkeleton className="h-40 w-full rounded-xl" />
              <DsrtSkeleton className="h-40 w-full rounded-xl" />
            </div>
          ) : error ? (
            <DsrtEmpty
              icon={Warning}
              title="Couldn't load conversation"
              description={error}
              action={
                <DsrtButton variant="outline" size="sm" onClick={loadThread}>
                  Retry
                </DsrtButton>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4 pb-5 pl-1 sm:pl-[54px] pr-1">
                <div className="min-w-0">
                  <h1 className="text-[18px] sm:text-[22px] md:text-[24px] font-semibold text-white leading-tight break-words tracking-tight">
                    {thread?.subject || '(no subject)'}
                  </h1>
                  {thread?.source_type && (
                    <div className="mt-2">
                      <DsrtChip size="sm" tone="neutral">
                        {thread.source_type}
                      </DsrtChip>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => updateThreadState({ is_starred: !isStarred }, isStarred ? 'Unstarred' : 'Starred')}
                  className={cn(
                    'w-10 h-10 rounded-full hover:bg-white/[0.06] flex items-center justify-center transition-colors flex-shrink-0',
                    isStarred ? 'text-amber-300' : 'text-white/30 hover:text-amber-300'
                  )}
                  title={isStarred ? 'Remove star' : 'Star message'}
                >
                  <Star className="w-5 h-5" weight={isStarred ? 'fill' : 'regular'} />
                </button>
              </div>

              <div className="flex flex-col">
                {messages.length === 0 ? (
                  <p className="text-white/40 text-[13px] py-10 pl-1 sm:pl-[54px]">No messages in this thread.</p>
                ) : (
                  messages.map((m, i) => (
                    <MessageCard
                      key={m.id}
                      message={m}
                      isFirst={i === 0}
                      isLast={i === messages.length - 1}
                      currentUserEmail={currentUserIdentity?.dsrt_email}
                      onReply={() => setActiveReplyMode('reply')}
                      onReplyAll={() => handleReplyInComposer('reply_all')}
                      onForward={() => handleReplyInComposer('forward')}
                    />
                  ))
                )}
              </div>

              {thread?.id && (
                <div className="pb-[env(safe-area-inset-bottom)]">
                  <QuickReplyBar
                    threadId={thread.id}
                    smartReplyIdentityId={smartReplyIdentityId}
                    activeMode={activeReplyMode}
                    setActiveMode={setActiveReplyMode}
                    onReplySent={loadThread}
                    onExpandToFull={handleReplyInComposer}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}