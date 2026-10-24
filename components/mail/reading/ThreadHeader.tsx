'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Trash, Tag, Envelope, DotsThreeVertical, Star, 
  ArrowsOutSimple, Archive, Clock, Printer, Warning,
  ArrowUUpLeft, ShieldCheck
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  thread: any
  participants: any[]
  attachmentsCount: number
  onArchive: () => void
  onTrash: () => void
  onStar: () => void
  onMarkUnread: () => void
  onSnooze: () => void
  onToggleContext: () => void
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  connect: { label: 'Connect', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  application: { label: 'Application', color: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  venture_invite: { label: 'Venture invite', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  project_invite: { label: 'Project invite', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  system: { label: 'System', color: 'bg-white/[0.06] text-white/50 border-white/[0.1]' },
}

export function ThreadHeader({ 
  thread, participants, attachmentsCount,
  onArchive, onTrash, onStar, onMarkUnread, onSnooze, onToggleContext 
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  
  const uniqueParticipants = Array.from(new Map(participants.map(p => [p.identity_id, p])).values())
  const sourceMeta = thread.source_type ? SOURCE_META[thread.source_type] : null
  const isStarred = thread.participant_state?.is_starred
  const currentFolder = thread.participant_state?.folder
  const isSpam = thread.participant_state?.is_spam
  const isTrashed = thread.participant_state?.is_trashed

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Folder-specific actions
  const handleRestore = async () => {
    try {
      await fetch(`/api/mail/threads/${thread.id}/state`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_trashed: false, folder: 'inbox' }) 
      })
      toast.success('Restored to inbox')
      window.dispatchEvent(new Event('mail:refresh'))
    } catch { toast.error('Failed to restore') }
  }

  const handleToggleSpam = async (markAsSpam: boolean) => {
    try {
      await fetch(`/api/mail/threads/${thread.id}/state`, { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_spam: markAsSpam, folder: markAsSpam ? 'spam' : 'inbox' }) 
      })
      toast.success(markAsSpam ? 'Moved to Spam' : 'Marked as Not Spam')
      setMoreOpen(false)
      window.dispatchEvent(new Event('mail:refresh'))
    } catch { toast.error('Action failed') }
  }

  return (
    <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.015] to-transparent flex-shrink-0">
      {/* Action toolbar */}
      <div className="h-11 px-4 flex items-center justify-between border-b border-white/[0.04]">
        <div className="flex items-center gap-0.5">
          
          {isTrashed ? (
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white transition-colors"
            >
              <ArrowUUpLeft className="w-3.5 h-3.5" weight="bold" />
              <span className="text-[12px] font-semibold">Restore</span>
            </button>
          ) : isSpam ? (
            <button
              onClick={() => handleToggleSpam(false)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md hover:bg-emerald-500/10 text-emerald-400/80 hover:text-emerald-400 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" weight="bold" />
              <span className="text-[12px] font-semibold">Not spam</span>
            </button>
          ) : (
            <>
              <button onClick={onArchive} className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors" title="Archive (E)">
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button onClick={onTrash} className="w-8 h-8 rounded-md hover:bg-red-500/10 text-white/60 hover:text-red-400 flex items-center justify-center transition-colors" title="Move to trash (#)">
                <Trash className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-white/[0.08] mx-1" />
              <button onClick={onMarkUnread} className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors" title="Mark as unread">
                <Envelope className="w-3.5 h-3.5" />
              </button>
              <button onClick={onSnooze} className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors" title="Snooze">
                <Clock className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          <button onClick={onToggleContext} className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors" title="Toggle context panel">
            <ArrowsOutSimple className="w-3.5 h-3.5" />
          </button>

          <div ref={moreRef} className="relative">
            <button onClick={() => setMoreOpen(!moreOpen)} className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition-colors" title="More">
              <DotsThreeVertical className="w-4 h-4" weight="bold" />
            </button>
            {moreOpen && (
              <div className={cn(
                "absolute top-full right-0 mt-1 w-[200px] z-50 rounded-lg overflow-hidden",
                "bg-gradient-to-b from-[#141419] to-[#0a0a0f]",
                "border border-white/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
              )}>
                <div className="p-1">
                  <button onClick={() => { window.print(); setMoreOpen(false) }} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-white/[0.04]">
                    <Printer className="w-3.5 h-3.5 text-white/60" />
                    <span className="text-[12px] font-semibold text-white/80">Print thread</span>
                  </button>
                  
                  {!isSpam && !isTrashed && (
                    <button onClick={() => handleToggleSpam(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-red-500/10 text-red-400/80 hover:text-red-400">
                      <Warning className="w-3.5 h-3.5" />
                      <span className="text-[12px] font-semibold">Report as spam</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject */}
      <div className="px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-[22px] font-bold text-white tracking-tight leading-tight break-words">
              {thread.subject || '(no subject)'}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {sourceMeta && (
                <span className={cn(
                  "text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border",
                  sourceMeta.color
                )}>
                  {sourceMeta.label}
                </span>
              )}
              {currentFolder === 'spam' && (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border bg-red-500/10 text-red-300 border-red-500/20">
                  Spam
                </span>
              )}
              <span className="text-[11px] text-white/50">
                {thread.message_count} message{thread.message_count !== 1 ? 's' : ''}
              </span>
              {attachmentsCount > 0 && (
                <>
                  <span className="text-white/25">·</span>
                  <span className="text-[11px] text-white/50">{attachmentsCount} attachment{attachmentsCount !== 1 ? 's' : ''}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onStar}
            className={cn(
              "w-8 h-8 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-colors flex-shrink-0",
              isStarred ? "text-amber-400" : "text-white/40 hover:text-amber-400"
            )}
          >
            <Star className="w-4 h-4" weight={isStarred ? "fill" : "regular"} />
          </button>
        </div>
      </div>
    </div>
  )
}