'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, MagnifyingGlass, Check, ArrowClockwise } from '@phosphor-icons/react'
import type { TeamUpFilters } from '@/types/teamup'
import { COMMITMENT_LABELS, WORK_MODE_LABELS } from '@/types/teamup'

interface Props {
  filters: TeamUpFilters
  onChange: (f: TeamUpFilters) => void
  onClose: () => void
}

const EXPERIENCE_OPTIONS = [
  { key: 'student',      label: 'Student' },
  { key: 'beginner',     label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced',     label: 'Advanced' },
  { key: 'expert',       label: 'Expert' },
  { key: 'founder',      label: 'Founder' },
  { key: 'professional', label: 'Professional' },
]

const STATUS_OPTIONS = [
  { key: 'active',       label: 'Active' },
  { key: 'closing_soon', label: 'Closing soon' },
  { key: 'open',         label: 'Open' },
]

interface Suggestion {
  id: string
  name?: string
  display?: string
  city?: string
  country?: string
  usage_count?: number
  category?: string
}

export function FiltersDrawer({ filters, onChange, onClose }: Props) {
  const [draft, setDraft] = useState<TeamUpFilters>(filters)

  // Section: Skills — searchable multi-select
  const [skillInput, setSkillInput] = useState('')
  const [skillSuggestions, setSkillSuggestions] = useState<Suggestion[]>([])
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false)

  // Section: Industry
  const [industryInput, setIndustryInput] = useState(filters.industry || '')
  const [industrySuggestions, setIndustrySuggestions] = useState<Suggestion[]>([])
  const [showIndustrySuggestions, setShowIndustrySuggestions] = useState(false)

  // Section: Location
  const [locationInput, setLocationInput] = useState(filters.location || '')
  const [locationSuggestions, setLocationSuggestions] = useState<Suggestion[]>([])
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // Escape to close + lock scroll
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (
    field: 'skills' | 'industries' | 'locations',
    q: string,
    setter: (list: Suggestion[]) => void
  ) => {
    try {
      const url = `/api/looking-for/search/suggestions?field=${field}&q=${encodeURIComponent(q)}&limit=10`
      const res = await fetch(url)
      const data = await res.json()
      setter(data.suggestions || [])
    } catch { /* ignore */ }
  }, [])

  // Debounced skill fetch
  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions('skills', skillInput, setSkillSuggestions), 200)
    return () => clearTimeout(t)
  }, [skillInput, fetchSuggestions])

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions('industries', industryInput, setIndustrySuggestions), 200)
    return () => clearTimeout(t)
  }, [industryInput, fetchSuggestions])

  useEffect(() => {
    const t = setTimeout(() => fetchSuggestions('locations', locationInput, setLocationSuggestions), 200)
    return () => clearTimeout(t)
  }, [locationInput, fetchSuggestions])

  const apply = () => {
    onChange({
      ...draft,
      industry: industryInput.trim() || undefined,
      location: locationInput.trim() || undefined,
    })
    onClose()
  }

  const reset = () => {
    setDraft({ type: draft.type, sort: draft.sort })
    setSkillInput('')
    setIndustryInput('')
    setLocationInput('')
  }

  const addSkill = (name: string) => {
    const existing = draft.skills || []
    if (existing.includes(name)) return
    setDraft({ ...draft, skills: [...existing, name] })
    setSkillInput('')
    setShowSkillSuggestions(false)
  }

  const removeSkill = (name: string) => {
    setDraft({ ...draft, skills: (draft.skills || []).filter(s => s !== name) })
  }

  // Active count for header
  const activeCount = [
    (draft.skills || []).length ? 1 : 0,
    industryInput.trim() ? 1 : 0,
    draft.commitment ? 1 : 0,
    draft.work_mode ? 1 : 0,
    draft.experience ? 1 : 0,
    locationInput.trim() ? 1 : 0,
    draft.status ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md h-full bg-[#0a0a0a] border-l border-zinc-800 flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-white">Filters</h2>
            {activeCount > 0 && (
              <span className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-semibold bg-white text-black">
                {activeCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-7">
            {/* SKILLS — searchable multi-select */}
            <Section title="Skills" subtitle="Match opportunities by required skills">
              <div className="relative">
                <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => { setSkillInput(e.target.value); setShowSkillSuggestions(true) }}
                  onFocus={() => setShowSkillSuggestions(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (skillInput.trim()) addSkill(skillInput.trim())
                    }
                  }}
                  placeholder="Search skills..."
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                {showSkillSuggestions && skillSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-10">
                    {skillSuggestions.map(s => {
                      const isSelected = (draft.skills || []).includes(s.name!)
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => addSkill(s.name!)}
                          disabled={isSelected}
                          className={
                            'w-full flex items-center justify-between gap-2 px-3 py-2 text-[12.5px] transition-colors ' +
                            (isSelected
                              ? 'text-zinc-600 cursor-default'
                              : 'text-zinc-200 hover:bg-zinc-900 hover:text-white')
                          }
                        >
                          <span className="truncate">{s.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {s.category && (
                              <span className="text-[10px] text-zinc-600">{s.category}</span>
                            )}
                            {isSelected ? (
                              <Check size={11} weight="bold" className="text-emerald-400" />
                            ) : s.usage_count ? (
                              <span className="text-[10px] text-zinc-600">·{s.usage_count}</span>
                            ) : null}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {(draft.skills || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {draft.skills!.map(s => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 h-6 pl-2 pr-1 rounded bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300"
                    >
                      {s}
                      <button
                        onClick={() => removeSkill(s)}
                        className="w-4 h-4 rounded flex items-center justify-center hover:bg-blue-500/20"
                      >
                        <X size={9} weight="bold" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Section>

            {/* COMMITMENT */}
            <Section title="Commitment" subtitle="How much time you can offer">
              <PillGrid
                options={Object.entries(COMMITMENT_LABELS).map(([k, l]) => ({ key: k, label: l }))}
                selected={draft.commitment ? [draft.commitment] : []}
                onSelect={(k) => setDraft({ ...draft, commitment: draft.commitment === k ? undefined : k })}
              />
            </Section>

            {/* WORK MODE */}
            <Section title="Work mode">
              <PillGrid
                options={Object.entries(WORK_MODE_LABELS).map(([k, l]) => ({ key: k, label: l }))}
                selected={draft.work_mode ? [draft.work_mode] : []}
                onSelect={(k) => setDraft({ ...draft, work_mode: draft.work_mode === k ? undefined : k })}
              />
            </Section>

            {/* EXPERIENCE */}
            <Section title="Experience level" subtitle="Where the opportunity fits you">
              <PillGrid
                options={EXPERIENCE_OPTIONS}
                selected={draft.experience ? [draft.experience] : []}
                onSelect={(k) => setDraft({ ...draft, experience: draft.experience === k ? undefined : k })}
              />
            </Section>

            {/* INDUSTRY */}
            <Section title="Industry" subtitle="Sectors you care about">
              <div className="relative">
                <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={industryInput}
                  onChange={(e) => { setIndustryInput(e.target.value); setShowIndustrySuggestions(true) }}
                  onFocus={() => setShowIndustrySuggestions(true)}
                  placeholder="AI, Fintech, Robotics, Healthcare..."
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                {showIndustrySuggestions && industrySuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-10">
                    {industrySuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setIndustryInput(s.name || '')
                          setShowIndustrySuggestions(false)
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-[12.5px] text-zinc-200 hover:bg-zinc-900 hover:text-white"
                      >
                        <span className="truncate">{s.name}</span>
                        {s.category && (
                          <span className="text-[10px] text-zinc-600 shrink-0">{s.category}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* LOCATION */}
            <Section title="Location" subtitle="Country, city, or region">
              <div className="relative">
                <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  value={locationInput}
                  onChange={(e) => { setLocationInput(e.target.value); setShowLocationSuggestions(true) }}
                  onFocus={() => setShowLocationSuggestions(true)}
                  placeholder="Remote, San Francisco, EU..."
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                />
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-zinc-800 bg-[#0a0a0a] shadow-xl z-10">
                    {locationSuggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setLocationInput(s.display || `${s.city || ''}, ${s.country || ''}`.trim())
                          setShowLocationSuggestions(false)
                        }}
                        className="w-full flex items-center px-3 py-2 text-[12.5px] text-zinc-200 hover:bg-zinc-900 hover:text-white truncate"
                      >
                        {s.display || `${s.city || ''}, ${s.country || ''}`}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Section>

            {/* STATUS */}
            <Section title="Availability">
              <PillGrid
                options={STATUS_OPTIONS}
                selected={draft.status ? [draft.status] : []}
                onSelect={(k) => setDraft({ ...draft, status: draft.status === k ? undefined : k })}
              />
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-zinc-800 shrink-0">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-zinc-800 hover:border-zinc-600 text-[12.5px] font-medium text-zinc-300"
          >
            <ArrowClockwise size={11} weight="regular" />
            Reset
          </button>
          <button
            onClick={apply}
            className="flex-1 h-9 rounded-md bg-white text-black hover:bg-zinc-200 text-[13px] font-semibold transition-colors"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title, subtitle, children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2.5">
        <div className="text-[12.5px] font-semibold text-zinc-200">{title}</div>
        {subtitle && (
          <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  )
}

function PillGrid({
  options, selected, onSelect,
}: {
  options: Array<{ key: string; label: string }>
  selected: string[]
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const isActive = selected.includes(o.key)
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect(o.key)}
            className={
              'inline-flex items-center h-8 px-3 rounded-md text-[12px] font-medium border transition-colors ' +
              (isActive
                ? 'bg-white text-black border-white'
                : 'bg-transparent border-zinc-800 text-zinc-300 hover:border-zinc-600')
            }
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
