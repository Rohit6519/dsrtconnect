'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  X, MagnifyingGlass, Check, Sparkle, CircleNotch, Plus,
} from '@phosphor-icons/react'

interface Props {
  initialSkills: string[]
  onSave: (skills: string[]) => void
  onClose: () => void
}

interface SkillOption {
  id: string
  name: string
  category?: string | null
  usage_count?: number | null
}

const CATEGORY_ORDER = [
  'popular',
  'Development',
  'Engineering',
  'Design',
  'Product',
  'Data',
  'AI & Machine Learning',
  'Marketing',
  'Sales',
  'Business',
  'Content',
  'Operations',
  'Research',
  'Other',
]

export function SkillsLightbox({ initialSkills, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(initialSkills)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('popular')
  const [skills, setSkills] = useState<SkillOption[]>([])
  const [loading, setLoading] = useState(true)
  const [popularOnly, setPopularOnly] = useState<SkillOption[]>([])

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Load full catalog on mount
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/looking-for/search/suggestions?field=skills&limit=500')
        const data = await res.json()
        if (cancelled) return
        setSkills(data.suggestions || [])
        setPopularOnly((data.suggestions || []).slice(0, 40))
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Live search
  useEffect(() => {
    if (!query || query.length < 1) return
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/looking-for/search/suggestions?field=skills&q=${encodeURIComponent(query)}&limit=200`)
        const data = await res.json()
        if (!cancelled) setSkills(data.suggestions || [])
      } catch { /* ignore */ }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  // Group skills by category
  const grouped = useMemo(() => {
    const g: Record<string, SkillOption[]> = {}
    for (const s of skills) {
      const cat = s.category || 'Other'
      if (!g[cat]) g[cat] = []
      g[cat].push(s)
    }
    return g
  }, [skills])

  const categories = useMemo(() => {
    const all = Object.keys(grouped)
    const ordered = CATEGORY_ORDER.filter(c => c === 'popular' || all.includes(c))
    const remaining = all.filter(c => !CATEGORY_ORDER.includes(c))
    return [...ordered, ...remaining]
  }, [grouped])

  const displayList = useMemo(() => {
    if (query) return skills
    if (category === 'popular') return popularOnly
    return grouped[category] || []
  }, [query, category, skills, popularOnly, grouped])

  const toggle = (name: string) => {
    setSelected(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name])
  }

  const addCustom = () => {
    const trimmed = query.trim()
    if (!trimmed) return
    if (selected.includes(trimmed)) return
    setSelected(prev => [...prev, trimmed])
    setQuery('')
  }

  const isCustomAvailable = query.trim().length > 0 &&
    !skills.some(s => s.name.toLowerCase() === query.trim().toLowerCase()) &&
    !selected.includes(query.trim())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-5xl h-[85vh] rounded-xl border border-zinc-800 bg-[#0a0a0a] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[19px] font-semibold text-white tracking-tight">Add skills</h2>
              <p className="text-[12.5px] text-zinc-500 mt-0.5">
                Pick up to 15 skills. The right skills help us match you with the best people.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-9 h-9 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
            >
              <X size={15} weight="bold" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlass size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isCustomAvailable) {
                  e.preventDefault()
                  addCustom()
                }
              }}
              placeholder="Search from thousands of skills..."
              autoFocus
              className="w-full h-11 pl-10 pr-4 rounded-md bg-zinc-950 border border-zinc-800 text-[14px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>

          {/* Selected pills */}
          {selected.length > 0 && (
            <div className="mt-3">
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-2">
                Selected · {selected.length}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selected.map(s => (
                  <button
                    key={s}
                    onClick={() => toggle(s)}
                    className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-[12px] text-blue-300 hover:bg-blue-500/15 group"
                  >
                    {s}
                    <span className="w-4 h-4 rounded flex items-center justify-center text-blue-300 group-hover:text-white">
                      <X size={9} weight="bold" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Body — 2 col: categories + skills grid */}
        <div className="flex-1 grid grid-cols-[200px_1fr] overflow-hidden">
          <aside className="border-r border-zinc-800 bg-zinc-950/40 overflow-y-auto py-3">
            {loading && !query ? (
              <div className="px-4 py-6 text-[12px] text-zinc-500 flex items-center gap-2">
                <CircleNotch size={12} className="animate-spin" />
                Loading...
              </div>
            ) : (
              <>
                {!query && (
                  <button
                    onClick={() => setCategory('popular')}
                    className={
                      'w-full flex items-center gap-2 px-4 py-2 text-left text-[12.5px] font-medium transition-colors ' +
                      (category === 'popular'
                        ? 'text-white bg-zinc-900'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60')
                    }
                  >
                    <Sparkle size={11} weight="fill" className="text-amber-400" />
                    Popular
                  </button>
                )}
                {categories.filter(c => c !== 'popular').map(c => (
                  <button
                    key={c}
                    onClick={() => { setCategory(c); setQuery('') }}
                    className={
                      'w-full flex items-center justify-between gap-2 px-4 py-2 text-left text-[12.5px] transition-colors ' +
                      (!query && category === c
                        ? 'text-white bg-zinc-900 font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60')
                    }
                  >
                    <span>{c}</span>
                    <span className="text-[10.5px] text-zinc-600">{grouped[c]?.length || 0}</span>
                  </button>
                ))}
              </>
            )}
          </aside>

          <main className="overflow-y-auto p-6">
            {loading ? (
              <div className="text-[12.5px] text-zinc-500 flex items-center gap-2 py-6">
                <CircleNotch size={13} className="animate-spin" />
                Loading skills...
              </div>
            ) : displayList.length === 0 ? (
              <div className="py-8 text-center">
                <div className="text-[13px] text-zinc-400 mb-3">
                  No skills found for "{query}"
                </div>
                {isCustomAvailable && (
                  <button
                    onClick={addCustom}
                    className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-semibold"
                  >
                    <Plus size={12} weight="bold" />
                    Add "{query}" as a custom skill
                  </button>
                )}
              </div>
            ) : (
              <>
                {query && isCustomAvailable && (
                  <button
                    onClick={addCustom}
                    className="w-full flex items-center gap-2 px-3 py-2.5 mb-4 rounded-md border border-dashed border-zinc-700 hover:border-zinc-500 text-[13px] text-zinc-300 hover:text-white transition-colors"
                  >
                    <Plus size={12} weight="bold" />
                    Add "<span className="font-semibold">{query}</span>" as a custom skill
                  </button>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {displayList.map(s => {
                    const isSelected = selected.includes(s.name)
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggle(s.name)}
                        className={
                          'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[12.5px] font-medium transition-colors ' +
                          (isSelected
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white')
                        }
                      >
                        {isSelected && <Check size={10} weight="bold" />}
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </main>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-950/40">
          <div className="text-[12px] text-zinc-500">
            {selected.length} skill{selected.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-600 text-[13px] text-zinc-300"
            >
              Cancel
            </button>
            <button
              onClick={() => { onSave(selected); onClose() }}
              className="h-9 px-4 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-semibold"
            >
              Save skills
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
