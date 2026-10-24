'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Envelope, EnvelopeOpen, Star, Paperclip, MagnifyingGlass, 
  User, Check, X as XIcon, PaperPlaneTilt, ArrowsCounterClockwise,
  PencilSimple, Archive, Trash, Tag, ShieldCheck, Handshake, Briefcase
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ComposeModal } from './ComposeModal'

interface Thread {
  id: string
  subject: string
  source_type: string
  source_entity_type?: string
  source_entity_id?: string
  last_message_at: string
  last_message_preview: string
  message_count: number
  action_state?: string
  participant_state: {
    is_read: boolean
    is_starred: boolean
    is_archived: boolean
    folder: string
  }
  last_sender?: {
    full_name: string
    username: string
    avatar_url?: string
    dsrt_email?: string
  }
}

const FOLDERS = [
  { key: 'inbox', label: 'Inbox', icon: Envelope },
  { key: 'unread', label: 'Unread', icon: EnvelopeOpen },
  { key: 'starred', label: 'Starred', icon: Star },
  { key: 'applications', label: 'Applications', icon: Briefcase },
  { key: 'connections', label: 'Connections', icon: Handshake },
  { key: 'sent', label: 'Sent Mail', icon: PaperPlaneTilt },
  { key: 'archived', label: 'Archived', icon: Archive },
  { key: 'trash', label: 'Trash', icon: Trash },
]

export function MailPage() {
  const [folder, setFolder] = useState('inbox')
  const [searchQ, setSearchQ] = useState('')
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  // Single Thread Detail State
  const [activeThread, setActiveThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [sourceEntity, setSourceEntity] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  
  // Reply & Compose
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  // ─── Fetch Threads List ───
  const fetchThreads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ folder })
      if (searchQ) params.append('q', searchQ)
      const res = await fetch('/api/mail/threads?' + params)
      const data = await res.json()
      setThreads(data.threads || [])
    } catch {
      toast.error('Failed to load mail')
    } finally {
      setLoading(false)
    }
  }, [folder, searchQ])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  // ─── Fetch Thread Detail ───
  useEffect(() => {
    if (!selectedId) {
      setActiveThread(null)
      setMessages([])
      return
    }
    setDetailLoading(true)
    fetch(`/api/mail/threads/${selectedId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setActiveThread(data.thread)
        setMessages(data.messages || [])
        setSourceEntity(data.source_entity)
        // Mark as read in list UI
        setThreads(prev => prev.map(t => t.id === selectedId ? {
          ...t, participant_state: { ...t.participant_state, is_read: true }
        } : t))
      })
      .catch(err => toast.error(err.message || 'Error loading thread'))
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  // ─── Send Reply ───
  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedId) return
    setReplying(true)
    try {
      const res = await fetch(`/api/mail/threads/${selectedId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body_html: replyText }),
      })
      if (!res.ok) throw new Error('Failed to send reply')
      setReplyText('')
      toast.success('Reply sent')
      // Refresh thread detail
      const updated = await fetch(`/api/mail/threads/${selectedId}`).then(r => r.json())
      setMessages(updated.messages || [])
    } catch {
      toast.error('Could not send reply')
    } finally {
      setReplying(false)
    }
  }

  // ─── Handle Action (Accept / Decline) ───
  const handleAction = async (action: 'accepted' | 'declined') => {
    if (!selectedId) return
    try {
      const res = await fetch(`/api/mail/threads/${selectedId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error('Action failed')
      toast.success(`Request ${action}`)
      // Reload active thread
      const updated = await fetch(`/api/mail/threads/${selectedId}`).then(r => r.json())
      setActiveThread(updated.thread)
      setMessages(updated.messages || [])
    } catch {
      toast.error('Failed to update action')
    }
  }

  // ─── Toggle Star / Archive ───
  const toggleStar = async (threadId: string, currentStarred: boolean) => {
    try {
      await fetch(`/api/mail/threads/${threadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_starred: !currentStarred }),
      })
      setThreads(prev => prev.map(t => t.id === threadId ? {
        ...t, participant_state: { ...t.participant_state, is_starred: !currentStarred }
      } : t))
    } catch {}
  }

  return (
    <div className="flex-1 min-h-screen bg-[#0a0a0b] text-zinc-100 flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800/60 px-6 flex items-center justify-between bg-zinc-950/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
            @
          </div>
          <h1 className="text-[16px] font-bold text-white tracking-tight">DSRT Mail</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchThreads()}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
            title="Refresh"
          >
            <ArrowsCounterClockwise className="w-4 h-4" />
          </button>
          <button
            onClick={() => setComposeOpen(true)}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-[13px] shadow-lg shadow-white/5 transition-all"
          >
            <PencilSimple className="w-4 h-4" weight="bold" />
            <span>Compose</span>
          </button>
        </div>
      </header>

      {/* 3-Column Layout Shell */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[220px_380px_1fr] overflow-hidden">
        
        {/* COLUMN 1: Sidebar */}
        <aside className="border-r border-zinc-800/60 bg-zinc-950/40 p-3 space-y-1">
          {FOLDERS.map(f => {
            const Icon = f.icon
            const active = folder === f.key
            return (
              <button
                key={f.key}
                onClick={() => { setFolder(f.key); setSelectedId(null) }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all",
                  active 
                    ? "bg-zinc-800/80 text-white font-semibold shadow-inner" 
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                )}
              >
                <Icon className={cn("w-4 h-4", active ? "text-blue-400" : "text-zinc-500")} weight={active ? "fill" : "regular"} />
                <span className="flex-1 text-left">{f.label}</span>
              </button>
            )
          })}
        </aside>

        {/* COLUMN 2: Thread List */}
        <section className="border-r border-zinc-800/60 flex flex-col bg-zinc-950/20">
          <div className="p-3 border-b border-zinc-800/60">
            <div className="relative">
              <MagnifyingGlass className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search mail..."
                className="w-full h-8 pl-8 pr-3 bg-zinc-900/60 border border-zinc-800 rounded-md text-[12px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
            {loading ? (
              <div className="p-6 text-center text-[12px] text-zinc-500">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-[12px]">No messages in this folder</div>
            ) : (
              threads.map(t => {
                const isSelected = selectedId === t.id
                const isUnread = !t.participant_state?.is_read
                const isStarred = t.participant_state?.is_starred

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "p-3.5 cursor-pointer transition-all flex items-start gap-3 relative group",
                      isSelected ? "bg-zinc-800/50" : "hover:bg-zinc-900/40",
                      isUnread && "bg-blue-500/[0.02]"
                    )}
                  >
                    {isUnread && (
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 absolute left-1.5 top-5" />
                    )}

                    <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 flex items-center justify-center border border-zinc-700/50">
                      {t.last_sender?.avatar_url ? (
                        <img src={t.last_sender.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={cn("text-[12.5px] truncate", isUnread ? "font-bold text-white" : "text-zinc-300 font-medium")}>
                          {t.last_sender?.full_name || 'System'}
                        </p>
                        <span className="text-[10px] text-zinc-500 flex-shrink-0">
                          {new Date(t.last_message_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>

                      <p className={cn("text-[12px] truncate mb-1", isUnread ? "font-semibold text-zinc-200" : "text-zinc-400")}>
                        {t.subject}
                      </p>

                      <p className="text-[11px] text-zinc-500 truncate leading-normal">
                        {t.last_message_preview}
                      </p>

                      {/* Source Badge */}
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border",
                          t.source_type === 'connect' && "bg-green-500/10 border-green-500/20 text-green-400",
                          t.source_type === 'application' && "bg-purple-500/10 border-purple-500/20 text-purple-400",
                          t.source_type === 'direct' && "bg-blue-500/10 border-blue-500/20 text-blue-400",
                          t.source_type === 'system' && "bg-zinc-800 border-zinc-700 text-zinc-400"
                        )}>
                          {t.source_type}
                        </span>

                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(t.id, isStarred) }}
                          className="ml-auto text-zinc-600 hover:text-yellow-400 transition-colors"
                        >
                          <Star className="w-3.5 h-3.5" weight={isStarred ? "fill" : "regular"} color={isStarred ? "#facc15" : undefined} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* COLUMN 3: Reading Pane */}
        <main className="flex-1 bg-[#0a0a0b] flex flex-col overflow-y-auto">
          {!selectedId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-600">
              <Envelope className="w-12 h-12 mb-3 text-zinc-800" weight="duotone" />
              <p className="text-[14px] font-medium text-zinc-400">Select a message to read</p>
            </div>
          ) : detailLoading ? (
            <div className="p-8 text-center text-zinc-500 text-[13px]">Loading conversation...</div>
          ) : activeThread && (
            <div className="flex-1 flex flex-col justify-between">
              
              {/* Thread Header */}
              <div className="p-6 border-b border-zinc-800/60 bg-zinc-950/30">
                <h2 className="text-[18px] font-bold text-white tracking-tight">{activeThread.subject}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Source:</span>
                  <span className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                    {activeThread.source_type}
                  </span>
                </div>

                {/* Source Entity Card Preview */}
                {sourceEntity && (
                  <div className="mt-4 p-3 bg-zinc-900/50 border border-zinc-800/80 rounded-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-white text-xs">
                      {sourceEntity.title ? sourceEntity.title[0] : sourceEntity.name ? sourceEntity.name[0] : 'E'}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white">{sourceEntity.title || sourceEntity.name}</p>
                      <p className="text-[11px] text-zinc-400">{sourceEntity.tagline || sourceEntity.opportunity_type || 'Attached entity'}</p>
                    </div>
                  </div>
                )}

                {/* Contextual Action Pipeline Banner */}
                {activeThread.source_type === 'connect' && (
                  <div className="mt-4 p-4 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-white">Connection Request</p>
                      <p className="text-[11px] text-zinc-400">Accepting will add this builder to your connections list.</p>
                    </div>
                    {activeThread.action_state ? (
                      <span className="text-[12px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
                        {activeThread.action_state}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction('declined')}
                          className="h-8 px-3 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-[12px] font-semibold"
                        >
                          Decline
                        </button>
                        <button
                          onClick={() => handleAction('accepted')}
                          className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[12px] font-bold shadow-lg shadow-blue-500/20"
                        >
                          Accept Request
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Messages Timeline */}
              <div className="p-6 space-y-6 flex-1">
                {messages.map((m: any) => (
                  <div key={m.id} className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700/50">
                          {m.sender?.avatar_url ? (
                            <img src={m.sender.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-zinc-400 m-2" />
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white">{m.sender?.full_name || 'System'}</p>
                          <p className="text-[11px] text-zinc-500">{m.sender_email}</p>
                        </div>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {new Date(m.sent_at).toLocaleString()}
                      </span>
                    </div>

                    <div 
                      className="text-[13.5px] text-zinc-200 leading-relaxed space-y-2"
                      dangerouslySetInnerHTML={{ __html: m.body_html }}
                    />

                    {/* Attachments rendering */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="pt-3 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
                        {m.attachments.map((att: any, idx: number) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
                          >
                            <Paperclip className="w-4 h-4 text-blue-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11.5px] font-medium text-zinc-300 truncate">{att.name || att.filename || 'Attachment'}</p>
                              <p className="text-[9px] text-zinc-500">Click to view</p>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Reply Box at Bottom */}
              <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/40">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-3">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="w-full min-h-[80px] bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none resize-y"
                  />
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                    <span className="text-[11px] text-zinc-500">Sending as @{activeThread.sender_email || 'dsrt.com'}</span>
                    <button
                      onClick={handleSendReply}
                      disabled={replying || !replyText.trim()}
                      className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[12px] disabled:opacity-40 transition-colors"
                    >
                      {replying ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Compose Modal */}
      {composeOpen && (
        <ComposeModal onClose={() => setComposeOpen(false)} onSent={() => { setComposeOpen(false); fetchThreads(); }} />
      )}
    </div>
  )
}