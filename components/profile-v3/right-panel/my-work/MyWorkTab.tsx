'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ProfileCard } from '../../shared/ProfileCard'
import { WorkCard, type WorkItem } from './WorkCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Briefcase,
  Code,
  Rocket,
  MagnifyingGlass,
  Plus,
  Spinner,
  GridFour,
  List,
  CaretDown,
  Star,
  Sparkle,
} from '@phosphor-icons/react'

// ─── Types ─────────────────────────────────────────────────────────────

type FilterId = 'all' | 'projects' | 'ventures' | 'featured' | 'active'
type SortId = 'recent' | 'alphabetical' | 'traction' | 'members'
type ViewMode = 'grid' | 'list'

const FILTERS: { id: FilterId; label: string; icon: React.ReactNode }[] = [
  { id: 'all',      label: 'All',       icon: <Briefcase className="w-3 h-3" weight="duotone" /> },
  { id: 'projects', label: 'Projects',  icon: <Code       className="w-3 h-3" weight="fill" /> },
  { id: 'ventures', label: 'Ventures',  icon: <Rocket     className="w-3 h-3" weight="fill" /> },
  { id: 'featured', label: 'Featured',  icon: <Star       className="w-3 h-3" weight="fill" /> },
  { id: 'active',   label: 'Active',    icon: <Sparkle    className="w-3 h-3" weight="fill" /> },
]

const SORTS: { id: SortId; label: string }[] = [
  { id: 'recent',       label: 'Most Recent'     },
  { id: 'alphabetical', label: 'A → Z'           },
  { id: 'traction',     label: 'Most Traction'   },
  { id: 'members',      label: 'Most Followers'  },
]

interface MyWorkTabProps {
  userId: string
  isOwner: boolean
}

// ─── Main Component ────────────────────────────────────────────────────

export function MyWorkTab({ userId, isOwner }: MyWorkTabProps) {
  const router = useRouter()
  const [projects, setProjects] = useState<WorkItem[]>([])
  const [ventures, setVentures] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterId>('all')
  const [sort, setSort] = useState<SortId>('recent')
  const [viewMode, setViewMode] = useState<ViewMode>('list')  // ← DEFAULT LIST
  const [search, setSearch] = useState('')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)

  // Load
  useEffect(() => {
    if (!userId) return
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/profile/my-work?user_id=${userId}`)
        if (res.ok) {
          const data = await res.json()
          setProjects(data.projects || [])
          setVentures(data.ventures || [])
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [userId])

  // Combine + filter + sort + search
  const filteredItems: WorkItem[] = useMemo(() => {
    let items: WorkItem[] = []

    if (filter === 'all' || filter === 'projects') items = items.concat(projects)
    if (filter === 'all' || filter === 'ventures') items = items.concat(ventures)

    if (filter === 'featured') {
      items = [...projects, ...ventures].filter((x) => x.is_featured)
    }
    if (filter === 'active') {
      items = [...projects, ...ventures].filter((x) => {
        const status = (x.status || '').toLowerCase()
        return status === 'active' || status === 'live' || status === 'launched' || status === 'building'
      })
    }

    // Search
    const q = search.trim().toLowerCase()
    if (q) {
      items = items.filter((x) =>
        x.name.toLowerCase().includes(q) ||
        (x.tagline || '').toLowerCase().includes(q) ||
        (x.description || '').toLowerCase().includes(q) ||
        (x.industry || '').toLowerCase().includes(q) ||
        (x.sector || '').toLowerCase().includes(q) ||
        (x.tech_stack || []).some((t) => t.toLowerCase().includes(q))
      )
    }

    // Sort
    items = [...items].sort((a, b) => {
      switch (sort) {
        case 'alphabetical':
          return a.name.localeCompare(b.name)
        case 'traction': {
          const at = a._type === 'project' ? (a.traction_score || 0) : (a.follower_count || 0)
          const bt = b._type === 'project' ? (b.traction_score || 0) : (b.follower_count || 0)
          return bt - at
        }
        case 'members':
          return (b.follower_count || 0) - (a.follower_count || 0)
        case 'recent':
        default: {
          const at = a.created_at ? new Date(a.created_at).getTime() : 0
          const bt = b.created_at ? new Date(b.created_at).getTime() : 0
          return bt - at
        }
      }
    })

    return items
  }, [projects, ventures, filter, sort, search])

  const totalCount = projects.length + ventures.length
  const currentSortLabel = SORTS.find((s) => s.id === sort)?.label || 'Sort'

  // ── Empty state (no data at all) ─────────────────────────────────────
  if (!loading && totalCount === 0) {
    return (
      <ProfileCard>
        <div className="py-12 text-center">
          <Briefcase className="w-10 h-10 text-zinc-700 mx-auto mb-3" weight="duotone" />
          <p className="text-[14px] font-bold text-zinc-300">No work yet</p>
          <p className="text-[12px] text-zinc-500 mt-1 mb-5">
            {isOwner
              ? 'Start by creating your first project or launching a venture'
              : 'This builder hasn\'t added any projects or ventures yet'}
          </p>
          {isOwner && (
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={() => router.push('/projects/new')}
                className="bg-white text-black hover:bg-zinc-100 h-8 text-xs"
              >
                <Code className="w-3.5 h-3.5 mr-1.5" weight="fill" />
                Create Project
              </Button>
              <Button
                onClick={() => router.push('/ventures/new')}
                variant="outline"
                className="border-zinc-700 bg-transparent text-zinc-300 hover:text-white h-8 text-xs"
              >
                <Rocket className="w-3.5 h-3.5 mr-1.5" weight="fill" />
                Launch Venture
              </Button>
            </div>
          )}
        </div>
      </ProfileCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header + counts + CTAs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-zinc-500" weight="duotone" />
          <h2 className="text-[14px] font-bold text-zinc-100 tracking-tight">
            My Work
          </h2>
          {!loading && (
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
              {projects.length} project{projects.length !== 1 ? 's' : ''} · {ventures.length} venture{ventures.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => router.push('/projects/new')}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors border border-zinc-800"
              title="New project"
            >
              <Code className="w-3 h-3" weight="fill" />
              <Plus className="w-2.5 h-2.5" weight="bold" />
            </button>
            <button
              onClick={() => router.push('/ventures/new')}
              className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors border border-zinc-800"
              title="New venture"
            >
              <Rocket className="w-3 h-3" weight="fill" />
              <Plus className="w-2.5 h-2.5" weight="bold" />
            </button>
          </div>
        )}
      </div>

      {/* Toolbar: search + filters + sort + view mode */}
      <ProfileCard className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" weight="bold" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search work..."
              className="w-full h-8 pl-8 pr-2 text-[12px] bg-zinc-900/60 border border-zinc-700 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-1 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold transition-colors border',
                  filter === f.id
                    ? 'bg-white text-black border-white'
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700',
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setSortMenuOpen((v) => !v)}
                className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-[11px] font-semibold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition-colors border border-zinc-800"
              >
                {currentSortLabel}
                <CaretDown className="w-2.5 h-2.5" weight="bold" />
              </button>
              <AnimatePresence>
                {sortMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setSortMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1 z-50 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden min-w-[160px]"
                    >
                      {SORTS.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => { setSort(s.id); setSortMenuOpen(false) }}
                          className={cn(
                            'w-full text-left px-3 py-2 text-[12px] transition-colors',
                            sort === s.id
                              ? 'bg-zinc-800 text-white font-semibold'
                              : 'text-zinc-400 hover:bg-zinc-900',
                          )}
                        >
                          {s.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center border border-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'w-7 h-7 flex items-center justify-center transition-colors',
                  viewMode === 'grid'
                    ? 'bg-white text-black'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900',
                )}
                title="Grid view"
              >
                <GridFour className="w-3.5 h-3.5" weight="bold" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'w-7 h-7 flex items-center justify-center transition-colors',
                  viewMode === 'list'
                    ? 'bg-white text-black'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900',
                )}
                title="List view"
              >
                <List className="w-3.5 h-3.5" weight="bold" />
              </button>
            </div>
          </div>
        </div>
      </ProfileCard>

      {/* Content */}
      {loading ? (
        <ProfileCard>
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-5 h-5 text-zinc-600 animate-spin" weight="bold" />
          </div>
        </ProfileCard>
      ) : filteredItems.length === 0 ? (
        <ProfileCard>
          <div className="py-10 text-center">
            <MagnifyingGlass className="w-8 h-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
            <p className="text-[13px] text-zinc-400 font-semibold">
              No results
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Try adjusting your search or filters
            </p>
            {(search || filter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilter('all') }}
                className="mt-3 text-[11px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </ProfileCard>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + filter + sort + search}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
                : 'space-y-3',
            )}
          >
            {filteredItems.map((item) => (
              <WorkCard
                key={`${item._type}-${item.id}`}
                item={item}
                viewMode={viewMode}
                isOwner={isOwner}  // ← FIX: pass isOwner (was missing)
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}