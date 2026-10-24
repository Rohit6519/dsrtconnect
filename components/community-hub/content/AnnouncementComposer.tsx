'use client'

import { useState, useTransition } from 'react'
import { Megaphone, Pin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'

interface Props {
  communityId: string
  onPosted?: () => void
}

export function AnnouncementComposer({ communityId, onPosted }: Props) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT'>('NORMAL')
  const [pinned, setPinned] = useState(false)
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setTitle(''); setBody(''); setPriority('NORMAL'); setPinned(false); setOpen(false)
  }

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Title and body required')
      return
    }
    startTransition(async () => {
      const res = await fetch('/api/v1/community/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `ann-${communityId}-${Date.now()}`,
        },
        body: JSON.stringify({
          community_id: communityId,
          title: title.trim(),
          body: body.trim(),
          priority,
          pinned,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Announcement failed')
        return
      }
      toast.success('Announcement published')
      reset()
      onPosted?.()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors p-4 text-left"
      >
        <div className="w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.04] flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-4 h-4 text-white/70" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-white">Publish an announcement</p>
          <p className="text-[11.5px] text-white/50">Notify every member. Optional pin.</p>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-white/70" strokeWidth={1.75} />
        <p className="label-mono text-white/60">New announcement</p>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Announcement title"
        maxLength={300}
        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] focus:border-white/[0.14] outline-none px-3 py-2 text-[14px] font-semibold text-white placeholder:text-white/30"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        placeholder="What do members need to know?"
        className="w-full rounded-lg border border-white/[0.06] bg-white/[0.02] focus:border-white/[0.14] outline-none px-3 py-2 text-[13px] text-white placeholder:text-white/30 resize-none leading-relaxed"
      />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
          {(['NORMAL', 'IMPORTANT', 'URGENT'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium transition-colors',
                priority === p ? 'bg-white text-black' : 'text-white/60 hover:text-white'
              )}
            >
              {p.toLowerCase()}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-1.5 text-[11.5px] text-white/70 cursor-pointer">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-white" />
          <Pin className="w-3 h-3" strokeWidth={1.75} />
          Pin
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={reset} className="text-[12px] text-white/50 hover:text-white px-3 py-2 transition-colors">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-white text-black hover:bg-zinc-100 px-4 py-1.5 text-[12px] font-semibold transition-colors"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" strokeWidth={1.75} />}
          Publish announcement
        </button>
      </div>
      {priority === 'URGENT' && (
        <p className="text-[10.5px] font-mono uppercase tracking-wider text-amber-300/85">
          Urgent announcements notify every active member immediately.
        </p>
      )}
    </div>
  )
}