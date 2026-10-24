'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatCircle } from '@phosphor-icons/react'
import { ConversationList } from '@/components/looking-for/my-opps/messages/ConversationList'
import { ConversationDetail } from '@/components/looking-for/my-opps/messages/ConversationDetail'

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export function MessagesTab({ opportunityId }: { opportunityId: string }) {
  const [convos, setConvos] = useState<any[] | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<any>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/opportunities/dashboard/messages', {
        cache: 'no-store',
      })
      const d = await safeJson(res)
      if (!res.ok) throw new Error(d?.error || `Failed (${res.status})`)
      const filtered = (d?.conversations || []).filter(
        (c: any) => c.opportunity?.id === opportunityId
      )
      setConvos(filtered)
    } catch (e: any) {
      setError(e?.message || 'Failed to load messages')
      setConvos([])
    }
  }, [opportunityId])

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
    } catch {}
  }, [])

  const handleSelect = (id: string) => {
    setActive(id)
    setConvos((prev) =>
      (prev || []).map((c) =>
        c.application_id === id ? { ...c, unread_count: 0 } : c
      )
    )
    markRead(id)
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4 text-[13px] text-red-300 flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold text-red-200">Messages failed to load</div>
          <div className="text-red-300/80 mt-0.5">{error}</div>
        </div>
        <button
          onClick={() => {
            setConvos(null)
            load()
          }}
          className="h-8 px-3 rounded-lg border border-red-500/30 text-red-200 hover:bg-red-500/10 text-[12px] font-semibold shrink-0"
        >
          Retry
        </button>
      </div>
    )
  }

  if (convos === null) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 h-[calc(100vh-260px)] min-h-[500px]">
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse hidden lg:block" />
      </div>
    )
  }

  if (convos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-14 text-center bg-gradient-to-b from-zinc-900/20 to-transparent">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center">
          <ChatCircle size={22} className="text-zinc-500" />
        </div>
        <h2 className="text-[16px] font-bold text-white mb-1">No messages yet</h2>
        <p className="text-[12.5px] text-zinc-500 max-w-md mx-auto">
          When applicants message you or you reply from an application, threads
          for this opportunity appear here.
        </p>
      </div>
    )
  }

  const activeConvo =
    convos.find((c) => c.application_id === active) || null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-6 h-[calc(100vh-260px)] min-h-[600px]">
      <div
        className={
          'flex flex-col rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden ' +
          (active ? 'hidden lg:flex' : 'flex')
        }
      >
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            items={convos}
            activeId={active}
            onSelect={handleSelect}
          />
        </div>
      </div>
      <div
        className={
          'flex flex-col rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] overflow-hidden ' +
          (!active ? 'hidden lg:flex items-center justify-center' : 'flex')
        }
      >
        {activeConvo ? (
          <ConversationDetail
            convo={activeConvo}
            onBack={() => setActive(null)}
            onReload={load}
          />
        ) : (
          <div className="text-center px-6">
            <ChatCircle size={32} className="text-zinc-700 mx-auto mb-3" />
            <div className="text-[14px] font-semibold text-zinc-300">
              Select a conversation
            </div>
            <div className="text-[12.5px] text-zinc-600 mt-1">
              Reply publicly to the applicant or leave a private internal note
              for your team.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}