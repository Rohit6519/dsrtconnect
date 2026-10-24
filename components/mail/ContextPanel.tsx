'use client'

import { useEffect, useState } from 'react'
import { X } from '@phosphor-icons/react'
import { SourceEntityCard } from './reading/SourceEntityCard'
import { ParticipantsList } from './context/ParticipantsList'
import { SharedFilesPanel } from './context/SharedFilesPanel'
import { RelatedConversations } from './context/RelatedConversations'

interface Props {
  threadId: string | null
  collapsed: boolean
  onClose: () => void
  onSelectThread: (id: string) => void
}

export function ContextPanel({ threadId, collapsed, onClose, onSelectThread }: Props) {
  const [thread, setThread] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [participants, setParticipants] = useState<any[]>([])
  const [sourceEntity, setSourceEntity] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!threadId || collapsed) return
    setLoading(true)
    fetch(`/api/mail/threads/${threadId}`)
      .then(r => r.json())
      .then(d => {
        setThread(d.thread)
        setMessages(d.messages || [])
        setParticipants(d.participants || [])
        setSourceEntity(d.source_entity)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [threadId, collapsed])

  if (collapsed) return null

  return (
    <aside className="w-[300px] flex-shrink-0 border-l border-white/[0.06] bg-gradient-to-b from-[#0a0a0f] to-[#050508] flex flex-col overflow-hidden">
      <div className="h-12 border-b border-white/[0.06] px-4 flex items-center justify-between">
        <p className="text-[12px] font-bold text-white tracking-tight">Context</p>
        <button 
          onClick={onClose}
          className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-3.5 h-3.5" weight="bold" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!threadId ? (
          <p className="text-[11.5px] text-white/40 text-center pt-8">
            Open a conversation to see its context.
          </p>
        ) : loading ? (
          <div className="space-y-3">
            <div className="h-20 bg-white/[0.02] rounded-xl animate-pulse" />
            <div className="h-32 bg-white/[0.02] rounded-xl animate-pulse" />
          </div>
        ) : thread ? (
          <>
            {/* Source Entity */}
            {sourceEntity && thread.source_entity_type && (
              <div>
                <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 mb-2">Attached to</p>
                <SourceEntityCard entityType={thread.source_entity_type} entity={sourceEntity} />
              </div>
            )}

            {/* Participants */}
            <ParticipantsList participants={participants} />

            {/* Shared files */}
            <SharedFilesPanel messages={messages} />

            {/* Related conversations */}
            {thread.source_entity_type && thread.source_entity_id && (
              <RelatedConversations
                entityType={thread.source_entity_type}
                entityId={thread.source_entity_id}
                excludeThreadId={thread.id}
                onSelectThread={onSelectThread}
              />
            )}
          </>
        ) : null}
      </div>
    </aside>
  )
}