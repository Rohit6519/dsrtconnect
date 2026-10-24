'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Briefcase, Plus, Users, CheckCircle, Files,
  ArrowUpRight, DotsThree, PauseCircle, PlayCircle,
  Copy, Archive, Trash, PencilSimple, Warning,
} from '@phosphor-icons/react'
import { EmptyState } from '../EmptyState'
import { FilterChips } from '../FilterChips'
import { REQUEST_TYPE_LABELS } from '@/types/teamup'

const FILTER_CHIPS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'drafts', label: 'Drafts' },
  { key: 'closed', label: 'Closed' },
]

interface Item {
  source_type: 'team_up' | 'venture_lf' | 'project_role'
  source_id: string
  display_title: string
  display_status: string
  display_created: string
  display_deadline: string | null
  display_positions: number
  real_application_count: number
  shortlisted_count: number
  context: { type: string; name?: string; slug?: string; logo_url?: string | null; icon?: string | null } | null
  request_type?: string
  type?: string
  urgency?: string
}

interface Stats {
  total: number
  active: number
  drafts: number
  closed: number
  total_applications: number
  total_shortlisted: number
  total_openings: number
}

interface Props {
  onCreate: () => void
}

export function MyHiringsTab({ onCreate }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('filter', filter)
      const res = await fetch(`/api/looking-for/my-hirings?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setItems(data.items || [])
      setStats(data.stats || null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const close = () => setOpenMenuId(null)
    if (openMenuId) {
      window.addEventListener('click', close)
      return () => window.removeEventListener('click', close)
    }
  }, [openMenuId])

  const updateStatus = async (item: Item, newStatus: string) => {
    if (item.source_type !== 'team_up') return
    try {
      await fetch(`/api/looking-for/${item.source_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      await load()
    } catch { /* ignore */ }
  }

  const deleteItem = async (item: Item) => {
    if (item.source_type !== 'team_up') return
    if (!confirm('Delete this request permanently? This cannot be undone.')) return
    try {
      await fetch(`/api/looking-for/${item.source_id}`, { method: 'DELETE' })
      await load()
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg border border-zinc-800 bg-zinc-950/40 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-20 rounded-xl border border-zinc-800/80 bg-zinc-950/40 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <EmptyState
        icon={<Warning size={20} weight="regular" />}
        title="Couldn't load your hirings"
        description={error}
      />
    )
  }

  const noItemsAtAll = stats?.total === 0

  if (noItemsAtAll) {
    return (
      <EmptyState
        icon={<Briefcase size={20} weight="regular" />}
        title="No team-up requests yet"
        description="Create your first request to start finding collaborators, hires, or co-founders."
        action={
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-medium"
          >
            <Plus size={13} weight="bold" />
            Create your first request
          </button>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Active requests" value={stats.active} Icon={Briefcase} />
          <StatCard label="Applications" value={stats.total_applications} Icon={Users} accent />
          <StatCard label="Shortlisted" value={stats.total_shortlisted} Icon={CheckCircle} />
          <StatCard label="Open positions" value={stats.total_openings} Icon={Files} />
        </div>
      )}

      {/* Filter chips + Create */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <FilterChips chips={FILTER_CHIPS} active={filter} onChange={setFilter} />
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300"
        >
          <Plus size={12} weight="bold" />
          New request
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={20} weight="regular" />}
          title={`No ${filter} requests`}
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <HiringRow
              key={`${item.source_type}-${item.source_id}`}
              item={item}
              menuOpen={openMenuId === `${item.source_type}-${item.source_id}`}
              onMenuToggle={(open) => setOpenMenuId(open ? `${item.source_type}-${item.source_id}` : null)}
              onUpdateStatus={(s) => updateStatus(item, s)}
              onDelete={() => deleteItem(item)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({
  label, value, Icon, accent,
}: {
  label: string
  value: number
  Icon: any
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </div>
        <Icon size={12} weight="regular" className="text-zinc-600" />
      </div>
      <div className={
        'text-[24px] font-semibold tracking-tight ' +
        (accent ? 'text-blue-400' : 'text-white')
      }>
        {value}
      </div>
    </div>
  )
}

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 4) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    active:        { label: 'Active',        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    open:          { label: 'Open',          className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    published:     { label: 'Published',     className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
    draft:         { label: 'Draft',         className: 'border-zinc-700 bg-zinc-900 text-zinc-400' },
    paused:        { label: 'Paused',        className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
    closing_soon:  { label: 'Closing soon',  className: 'border-orange-500/30 bg-orange-500/10 text-orange-400' },
    filled:        { label: 'Filled',        className: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
    closed:        { label: 'Closed',        className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
    archived:      { label: 'Archived',      className: 'border-zinc-700 bg-zinc-900 text-zinc-500' },
  }
  return map[status] || { label: status, className: 'border-zinc-700 bg-zinc-900 text-zinc-400' }
}

function HiringRow({
  item, menuOpen, onMenuToggle, onUpdateStatus, onDelete,
}: {
  item: Item
  menuOpen: boolean
  onMenuToggle: (open: boolean) => void
  onUpdateStatus: (status: string) => void
  onDelete: () => void
}) {
  const badge = statusBadge(item.display_status)
  const typeLabel = REQUEST_TYPE_LABELS[item.request_type || item.type || ''] || null
  const manageUrl = `/looking-for/my-hirings/${item.source_id}?source=${item.source_type}`
  const viewUrl = `/looking-for/${item.source_id}?source=${item.source_type}`
  const isTeamUp = item.source_type === 'team_up'

  return (
    <div className="group relative rounded-xl border border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-4 p-4">
        {/* Context icon */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-800 shrink-0 relative flex items-center justify-center">
          {item.context?.logo_url ? (
            <Image src={item.context.logo_url} alt="" fill className="object-cover" sizes="40px" />
          ) : item.context?.icon ? (
            <span className="text-[15px]">{item.context.icon}</span>
          ) : (
            <Briefcase size={16} className="text-zinc-500" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={manageUrl}
              className="text-[14px] font-semibold text-white hover:text-blue-400 transition-colors truncate max-w-md"
            >
              {item.display_title}
            </Link>
            <span className={
              'inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider border ' +
              badge.className
            }>
              {badge.label}
            </span>
            {typeLabel && (
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10px] font-medium uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                {typeLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11.5px] text-zinc-500">
            {item.context?.name && <span className="text-zinc-400">{item.context.name}</span>}
            {item.context?.name && <span className="w-1 h-1 rounded-full bg-zinc-700" />}
            <span>{item.display_positions || 0} opening{item.display_positions !== 1 ? 's' : ''}</span>
            {item.display_created && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span>Posted {timeAgo(item.display_created)}</span>
              </>
            )}
          </div>
        </div>

        {/* Application count */}
        <div className="text-right shrink-0 px-4">
          <div className="text-[10.5px] uppercase tracking-[0.1em] text-zinc-500 mb-0.5">
            Applications
          </div>
          <div className="text-[16px] font-semibold text-white">
            {item.real_application_count}
          </div>
          {item.shortlisted_count > 0 && (
            <div className="text-[10.5px] text-blue-400 mt-0.5">
              {item.shortlisted_count} shortlisted
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href={manageUrl}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 bg-transparent text-zinc-300 text-[12px] font-medium"
          >
            Manage
            <ArrowUpRight size={11} weight="bold" />
          </Link>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); onMenuToggle(!menuOpen) }}
              className="w-8 h-8 rounded-md border border-zinc-800 hover:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200"
            >
              <DotsThree size={14} weight="bold" />
            </button>
            {menuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-full mt-1 w-48 rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-20 py-1"
              >
                <MenuItem href={viewUrl} Icon={ArrowUpRight}>View public</MenuItem>
                {isTeamUp && item.display_status === 'draft' && (
                  <MenuItem onClick={() => { onUpdateStatus('active'); onMenuToggle(false) }} Icon={PlayCircle}>Publish</MenuItem>
                )}
                {isTeamUp && (item.display_status === 'active' || item.display_status === 'published') && (
                  <MenuItem onClick={() => { onUpdateStatus('paused'); onMenuToggle(false) }} Icon={PauseCircle}>Pause</MenuItem>
                )}
                {isTeamUp && item.display_status === 'paused' && (
                  <MenuItem onClick={() => { onUpdateStatus('active'); onMenuToggle(false) }} Icon={PlayCircle}>Resume</MenuItem>
                )}
                {isTeamUp && !['closed','filled','archived'].includes(item.display_status) && (
                  <MenuItem onClick={() => { onUpdateStatus('filled'); onMenuToggle(false) }} Icon={CheckCircle}>Mark as filled</MenuItem>
                )}
                {isTeamUp && !['closed','archived'].includes(item.display_status) && (
                  <MenuItem onClick={() => { onUpdateStatus('closed'); onMenuToggle(false) }} Icon={Archive}>Close</MenuItem>
                )}
                {isTeamUp && item.display_status !== 'archived' && (
                  <MenuItem onClick={() => { onUpdateStatus('archived'); onMenuToggle(false) }} Icon={Archive}>Archive</MenuItem>
                )}
                {isTeamUp && (
                  <>
                    <div className="my-1 border-t border-zinc-800" />
                    <MenuItem onClick={() => { onDelete(); onMenuToggle(false) }} Icon={Trash} destructive>Delete</MenuItem>
                  </>
                )}
                {!isTeamUp && (
                  <MenuItem
                    href={item.source_type === 'venture_lf'
                      ? `/ventures/${item.context?.slug}`
                      : `/projects/${item.context?.slug}`}
                    Icon={PencilSimple}
                  >
                    Manage in {item.source_type === 'venture_lf' ? 'venture' : 'project'}
                  </MenuItem>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuItem({
  children, href, onClick, Icon, destructive,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  Icon: any
  destructive?: boolean
}) {
  const cls =
    'w-full flex items-center gap-2 px-3 py-2 text-[12.5px] transition-colors ' +
    (destructive
      ? 'text-red-400 hover:bg-red-500/10'
      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')
  if (href) {
    return (
      <Link href={href} className={cls}>
        <Icon size={12} weight="regular" />
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Icon size={12} weight="regular" />
      {children}
    </button>
  )
}
