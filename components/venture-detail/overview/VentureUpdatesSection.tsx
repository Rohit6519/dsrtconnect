'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Plus, ChatCircle, Package, Users, TrendUp, CurrencyDollar, Star, Megaphone,
  Lightbulb, Wrench, Code, Rocket
} from '@phosphor-icons/react'
import { VentureUpdateModal } from '../updates/VentureUpdateModal'

interface Props {
  venture: any
  isOwner: boolean
}

const TYPE_META: Record<string, { label: string; icon: any; tint: string }> = {
  general:      { label: 'General Update', icon: ChatCircle,   tint: 'text-white/70 bg-white/[0.06]' },
  release:      { label: 'Release',        icon: Rocket,       tint: 'text-purple-300 bg-purple-500/10' },
  building:     { label: 'Building',       icon: Wrench,       tint: 'text-blue-300 bg-blue-500/10' },
  experiment:   { label: 'Experiment',     icon: Code,         tint: 'text-cyan-300 bg-cyan-500/10' },
  progress:     { label: 'Progress',       icon: TrendUp,      tint: 'text-emerald-300 bg-emerald-500/10' },
  fix:          { label: 'Fix',            icon: Wrench,       tint: 'text-orange-300 bg-orange-500/10' },
  announcement: { label: 'Announcement',   icon: Megaphone,    tint: 'text-red-300 bg-red-500/10' },
  collaboration:{ label: 'Collaboration',  icon: Users,        tint: 'text-pink-300 bg-pink-500/10' },
  insight:      { label: 'Insight',        icon: Lightbulb,    tint: 'text-yellow-300 bg-yellow-500/10' },
  hiring:       { label: 'Hiring',         icon: Users,        tint: 'text-emerald-300 bg-emerald-500/10' },
  business:     { label: 'Business',       icon: TrendUp,      tint: 'text-purple-300 bg-purple-500/10' },
  funding:      { label: 'Funding',        icon: CurrencyDollar,tint: 'text-yellow-300 bg-yellow-500/10' },
  milestone:    { label: 'Milestone',      icon: Star,         tint: 'text-orange-300 bg-orange-500/10' },
  product:      { label: 'Product',        icon: Package,      tint: 'text-blue-300 bg-blue-500/10' },
}

const FILTER_TABS = ['All', 'Releases', 'Building', 'Experiments', 'Announcements', 'Discussions']

export function VentureUpdatesSection({ venture, isOwner }: Props) {
  const [updates, setUpdates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [composerOpen, setComposerOpen] = useState(false)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')

  const fetchUpdates = () => {
    fetch('/api/ventures/' + venture.slug + '/updates')
      .then(r => r.json())
      .then(d => { setUpdates(d.updates || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(fetchUpdates, [venture.slug])

  const filtered = updates
    .filter(u => {
      if (filter === 'All') return true
      const f = filter.toLowerCase().replace(/s$/, '')
      return u.type === f
    })
    .sort((a, b) => sort === 'newest'
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

  return (
    <>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-white">Updates</h2>
            <p className="text-[12px] text-white/45 mt-0.5">What the team is shipping and building</p>
          </div>
          {isOwner && (
            <button onClick={() => setComposerOpen(true)}
              className="text-[12.5px] font-semibold text-black bg-white hover:bg-white/90 h-8 px-3 rounded-lg flex items-center gap-1.5">
              <Plus size={12} weight="bold" /> Post update
            </button>
          )}
        </div>

        <div className="px-5 pt-4 flex items-center justify-between border-b border-white/[0.06]">
          <div className="flex gap-0 -mb-px overflow-x-auto scrollbar-hide">
            {FILTER_TABS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={'px-3 py-2.5 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ' +
                  (filter === f ? 'text-white border-white' : 'text-white/45 border-transparent hover:text-white/80')}>
                {f}
              </button>
            ))}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as any)}
            className="text-[11.5px] text-white/70 bg-white/[0.04] border border-white/[0.08] rounded-md px-2 py-1 outline-none">
            <option value="newest" className="bg-[#12121a]">Newest</option>
            <option value="oldest" className="bg-[#12121a]">Oldest</option>
          </select>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.03] rounded-lg animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <div className="inline-flex w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] items-center justify-center mb-3">
                <ChatCircle size={18} className="text-white/40" />
              </div>
              <p className="text-[13.5px] font-semibold text-white/70">No updates yet</p>
              <p className="text-[11.5px] text-white/40 mt-1">
                {isOwner ? 'Post your first update to share progress with your community.' : 'Check back later.'}
              </p>
              {isOwner && (
                <button onClick={() => setComposerOpen(true)} className="mt-3 text-[12px] font-semibold text-purple-300 hover:text-purple-200 inline-flex items-center gap-1">
                  <Plus size={11} weight="bold" /> Post first update
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(u => <UpdateRow key={u.id} update={u} />)}
            </div>
          )}
        </div>
      </div>

      {composerOpen && (
        <VentureUpdateModal
          slug={venture.slug}
          onClose={() => setComposerOpen(false)}
          onPosted={() => { setComposerOpen(false); fetchUpdates() }}
        />
      )}
    </>
  )
}

function UpdateRow({ update }: { update: any }) {
  const meta = TYPE_META[update.type] || TYPE_META.general
  const Icon = meta.icon
  const u = update.users

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] rounded-xl p-4 transition-colors">
      <div className="flex items-start gap-3">
        <div className={'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ' + meta.tint}>
          <Icon size={14} weight="regular" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={'text-[10px] font-bold uppercase tracking-wider ' + meta.tint.split(' ')[0]}>{meta.label}</span>
              <h3 className="text-[14.5px] font-bold text-white mt-0.5 leading-tight">{update.title}</h3>
            </div>
            <span className="text-[10.5px] text-white/40 whitespace-nowrap flex-shrink-0">
              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
            </span>
          </div>
          {update.content && (
            <p className="text-[13px] text-white/70 leading-relaxed mt-2 whitespace-pre-wrap line-clamp-4">{update.content}</p>
          )}
          {u && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[9px] font-bold text-purple-200">{u.full_name?.charAt(0)}</div>
              )}
              <span className="text-[11px] text-white/50">{u.full_name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}