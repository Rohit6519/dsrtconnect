'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { FileEdit, Trash2, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { DraftItem } from '@/hooks/useMyCommunities'

interface Props {
  drafts: DraftItem[]
  onDiscarded: (id: string) => void
}

export function DraftsStrip({ drafts, onDiscarded }: Props) {
  if (drafts.length === 0) return null
  return (
    <section>
      <p className="label-mono text-white/50 mb-3">Drafts in progress</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {drafts.map((d) => (
          <DraftCard key={d.id} draft={d} onDiscarded={onDiscarded} />
        ))}
      </div>
    </section>
  )
}

function DraftCard({ draft, onDiscarded }: { draft: DraftItem; onDiscarded: (id: string) => void }) {
  const [pending, startTransition] = useTransition()
  const data = draft.data || {}
  const name = data.name || 'Untitled community'

  const discard = () => {
    if (!confirm('Discard this draft? This cannot be undone.')) return
    startTransition(async () => {
      const res = await fetch(`/api/v1/community/drafts/${draft.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.message('Draft discarded')
        onDiscarded(draft.id)
      } else {
        toast.error('Could not discard draft')
      }
    })
  }

  return (
    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4 flex items-center gap-3">
      <div className="w-11 h-11 rounded-lg border border-white/[0.06] bg-white/[0.04] flex items-center justify-center flex-shrink-0">
        <FileEdit className="w-4 h-4 text-white/60" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white truncate">{name}</p>
        <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-0.5">
          Step: {draft.step} · Saved {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href={`/studio/community/${draft.id}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-white text-black hover:bg-zinc-100 px-3 py-1 text-[11px] font-semibold transition-colors'
          )}
        >
          Continue
        </Link>
        <button
          onClick={discard}
          disabled={pending}
          className="w-8 h-8 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center transition-colors"
          aria-label="Discard draft"
        >
          {pending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  )
}