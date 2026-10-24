'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MagnifyingGlass, ChatCircle } from '@phosphor-icons/react'
import { ConversationList } from './ConversationList'
import { ConversationDetail } from './ConversationDetail'

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [activeAppId, setActiveAppId] = useState<string | null>(null)
  const pollRef = useRef<any>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/opportunities/dashboard/messages', {
        cache: 'no-store',
      })
      const data = await safeJson(res)
      if (!res.ok) {
        throw new Error(data?.error || `Failed (${res.status})`)
      }
      setConversations(data?.conversations || [])
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, 15000)
    return () => clearInterval(pollRef.current)
  }, [load])

  const markRead = useCallback(async (appId: string) => {
    try {
      await fetch('/api/opportunities/dashboard/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: appId }),
      })
    } catch {
      /* silent */
    }
  }, [])

  const handleSelect = (appId: string) => {
    setActiveAppId(appId)
    setConversations((prev) =>
      prev.map((c) =>
        c.application_id === appId ? { ...c, unread_count: 0 } : c
      )
    )
    markRead(appId)
  }

  const filtered = conversations.filter((c) => {
    if (!q) return true
    const s = q.toLowerCase()
    const name = (
      c.applicant?.full_name ||
      c.applicant?.username ||
      ''
    ).toLowerCase()
    const opp = (c.opportunity?.title || '').toLowerCase()
    return name.includes(s) || opp.includes(s)
  })

  const activeConvo =
    conversations.find((c) => c.application_id === activeAppId) || null

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 h-[calc(100vh-260px)] min-h-[500px]">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse hidden lg:block" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4 text-[13px] text-red-300 flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-red-200">Messages failed to load</div>
            <div className="text-red-300/80 mt-0.5">{error}</div>
          </div>
          <button
            onClick={() => {
              setLoading(true)
              load()
            }}
            className="shrink-0 h-8 px-3 rounded-lg border border-red-500/30 text-red-200 hover:bg-red-500/10 text-[12px] font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <ChatCircle size={22} className="text-zinc-500" />
        </div>
        <h2 className="text-[16px] font-bold text-white mb-1">
          No conversations yet
        </h2>
        <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto">
          When applicants apply with a message, or when you reply to them from an
          application, threads for your opportunities appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 h-[calc(100vh-260px)] min-h-[600px]">
      {/* Left */}
      <div
        className={
          'flex flex-col rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden ' +
          (activeAppId ? 'hidden lg:flex' : 'flex')
        }
      >
        <div className="p-4 border-b border-zinc-800/80 shrink-0">
          <div className="relative">
            <MagnifyingGlass
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search conversations…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            items={filtered}
            activeId={activeAppId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Right */}
      <div
        className={
          'flex flex-col rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden ' +
          (!activeAppId ? 'hidden lg:flex items-center justify-center' : 'flex')
        }
      >
        {activeConvo ? (
          <ConversationDetail
            convo={activeConvo}
            onBack={() => setActiveAppId(null)}
            onReload={load}
          />
        ) : (
          <div className="text-center px-6">
            <ChatCircle size={32} className="text-zinc-700 mx-auto mb-3" />
            <div className="text-[14px] font-semibold text-zinc-300">
              Select a conversation
            </div>
            <div className="text-[12.5px] text-zinc-600 mt-1">
              Message history and internal notes will appear here.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}