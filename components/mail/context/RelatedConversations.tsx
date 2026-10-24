'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChatCircle } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  entityType: string
  entityId: string
  excludeThreadId: string
  onSelectThread: (id: string) => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function RelatedConversations({ entityType, entityId, excludeThreadId, onSelectThread }: Props) {
  const [related, setRelated] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/mail/context?entity_type=${entityType}&entity_id=${entityId}&exclude_thread_id=${excludeThreadId}`)
      .then(r => r.json())
      .then(d => setRelated(d.related || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entityType, entityId, excludeThreadId])

  if (loading || related.length === 0) return null

  return (
    <div>
      <p className="text-[9.5px] uppercase tracking-wider font-bold text-white/40 mb-2">Related conversations</p>
      <div className="space-y-1">
        {related.map(t => (
          <button
            key={t.id}
            onClick={() => onSelectThread(t.id)}
            className="w-full flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-colors text-left"
          >
            <ChatCircle className="w-3.5 h-3.5 text-white/40 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11.5px] font-bold text-white truncate">{t.subject}</p>
              <p className="text-[10.5px] text-white/50 truncate mt-0.5">{t.last_message_preview}</p>
              <p className="text-[9.5px] text-white/40 mt-1">{formatDate(t.last_message_at)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}