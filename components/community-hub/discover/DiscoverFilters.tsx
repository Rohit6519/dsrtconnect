'use client'

import { useState } from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export interface DiscoverFilterState {
  category?: string
  community_type?: string
  join_policy?: string
  sort?: 'members' | 'newest' | 'active'
  verified_only?: boolean
  location?: string
}

interface Props {
  value: DiscoverFilterState
  onChange: (next: DiscoverFilterState) => void
}

const COMMUNITY_TYPES = [
  'university', 'organization', 'founders', 'technology', 'research',
  'open_source', 'interest', 'project', 'venture', 'event',
]

const JOIN_POLICIES = [
  { key: 'OPEN', label: 'Open' },
  { key: 'APPROVAL_REQUIRED', label: 'Approval required' },
  { key: 'INVITE_ONLY', label: 'Invite only' },
]

const SORTS = [
  { key: 'members', label: 'Most members' },
  { key: 'newest', label: 'Newest' },
  { key: 'active', label: 'Most active' },
]

export function DiscoverFilters({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  const activeCount =
    (value.category ? 1 : 0) +
    (value.community_type ? 1 : 0) +
    (value.join_policy ? 1 : 0) +
    (value.verified_only ? 1 : 0) +
    (value.location ? 1 : 0)

  const apply = () => {
    onChange(draft)
    setOpen(false)
  }

  const reset = () => {
    const cleared: DiscoverFilterState = { sort: draft.sort ?? 'members' }
    setDraft(cleared)
    onChange(cleared)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Sort */}
      <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => onChange({ ...value, sort: s.key as any })}
            className={cn(
              'px-3 py-1 rounded-full text-[11px] font-medium transition-colors',
              value.sort === s.key || (!value.sort && s.key === 'members')
                ? 'bg-white text-black'
                : 'text-white/60 hover:text-white'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Filter drawer */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors',
              activeCount > 0
                ? 'border-white/[0.14] bg-white/[0.06] text-white'
                : 'border-white/[0.06] bg-white/[0.02] text-white/60 hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <SlidersHorizontal className="w-3 h-3" strokeWidth={1.75} />
            Filters
            {activeCount > 0 && (
              <span className="ml-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-white/[0.1] text-white/80">
                {activeCount}
              </span>
            )}
          </button>
        </DialogTrigger>
        <DialogContent className="bg-[#0c0c12] border-white/[0.08] text-white max-w-lg sm:rounded-2xl p-0">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="label-mono text-white/40">Filters</p>
              <p className="text-[15px] font-semibold text-white mt-1">
                Refine communities
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Verified */}
            <div>
              <p className="label-mono text-white/50 mb-2">Trust</p>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.verified_only ?? false}
                  onChange={(e) => setDraft({ ...draft, verified_only: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-white"
                />
                <span className="text-[13px] text-white/80">Verified communities only</span>
              </label>
            </div>

            {/* Join policy */}
            <div>
              <p className="label-mono text-white/50 mb-2">Join policy</p>
              <div className="flex flex-wrap gap-1.5">
                {JOIN_POLICIES.map((p) => (
                  <button
                    key={p.key}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        join_policy: draft.join_policy === p.key ? undefined : p.key,
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded-full text-[11.5px] border transition-colors',
                      draft.join_policy === p.key
                        ? 'bg-white text-black border-white'
                        : 'border-white/[0.08] bg-white/[0.02] text-white/70 hover:bg-white/[0.05]'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Community type */}
            <div>
              <p className="label-mono text-white/50 mb-2">Community type</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMUNITY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        community_type: draft.community_type === t ? undefined : t,
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded-full text-[11.5px] border transition-colors',
                      draft.community_type === t
                        ? 'bg-white text-black border-white'
                        : 'border-white/[0.08] bg-white/[0.02] text-white/70 hover:bg-white/[0.05]'
                    )}
                  >
                    {t.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="label-mono text-white/50 mb-2">Location</p>
              <input
                type="text"
                value={draft.location ?? ''}
                onChange={(e) => setDraft({ ...draft, location: e.target.value })}
                placeholder="City, country, or region…"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-[13px] text-white placeholder:text-white/30 outline-none focus:border-white/[0.18]"
              />
            </div>
          </div>

          <div className="p-5 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={reset}
              className="text-[12px] text-white/50 hover:text-white transition-colors"
            >
              Reset
            </button>
            <button
              onClick={apply}
              className="rounded-full bg-white text-black px-4 py-1.5 text-[12px] font-semibold hover:bg-zinc-100"
            >
              Apply filters
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}