// filepath: components/looking-for/v2/FiltersPanel.tsx
'use client'

import { useState, useEffect } from 'react'
import { CaretDown, CaretUp } from '@phosphor-icons/react'
import { DsrtPanel, DsrtInput } from '@/components/dsrt'
import { cn } from '@/lib/utils'

export interface FilterState {
  category: string | null
  subcategory: string | null
  type: string | null
  experience: string | null
  compensation: string | null
  work_mode: string | null
  location: string | null
  time_commitment: string | null
  project_length: string | null
  post_age: string | null
  skills: string[]
  min_budget: number | null
  max_budget: number | null
}

interface Props {
  filters: FilterState
  onChange: (f: FilterState) => void
}

interface Category {
  id: string
  name: string
  slug: string
  subcategories?: Category[]
}

const OPPORTUNITY_TYPES = [
  { value: 'hire', label: 'Hire' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'project-collaboration', label: 'Project Collaboration' },
  { value: 'team-up', label: 'Team Up' },
  { value: 'cofounder', label: 'Co-founder' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'research', label: 'Research' },
  { value: 'open-source', label: 'Open Source' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'consulting', label: 'Consulting' },
]

const EXPERIENCE_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
  { value: 'student', label: 'Student' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'professional', label: 'Professional' },
]

const COMPENSATION_TYPES = [
  { value: 'hourly', label: 'Hourly' },
  { value: 'fixed-price', label: 'Fixed Price' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
  { value: 'equity', label: 'Equity' },
  { value: 'equity-plus-cash', label: 'Equity + Cash' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'volunteer', label: 'Volunteer' },
]

const WORK_MODES = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on-site', label: 'On-site' },
  { value: 'flexible', label: 'Flexible' },
]

const TIME_COMMITMENTS = [
  { value: 'less-than-5', label: 'Less than 5 hrs/wk' },
  { value: '5-10', label: '5–10 hrs/wk' },
  { value: '10-20', label: '10–20 hrs/wk' },
  { value: '20-30', label: '20–30 hrs/wk' },
  { value: '30-plus', label: '30+ hrs/wk' },
  { value: 'flexible', label: 'Flexible' },
]

const PROJECT_LENGTHS = [
  { value: 'one-off', label: 'One-off' },
  { value: 'less-than-1-month', label: 'Less than 1 month' },
  { value: '1-3-months', label: '1–3 months' },
  { value: '3-6-months', label: '3–6 months' },
  { value: '6-12-months', label: '6–12 months' },
  { value: 'long-term', label: 'Long-term' },
  { value: 'ongoing', label: 'Ongoing' },
]

const POST_AGES = [
  { value: 'today', label: 'Today' },
  { value: 'last-3-days', label: 'Last 3 days' },
  { value: 'last-week', label: 'Last week' },
  { value: 'last-month', label: 'Last month' },
]

export function FiltersPanel({ filters, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch('/api/opportunities/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {})
  }, [])

  const activeCount =
    [
      filters.category,
      filters.type,
      filters.experience,
      filters.compensation,
      filters.work_mode,
      filters.location,
      filters.time_commitment,
      filters.project_length,
      filters.post_age,
    ].filter(Boolean).length + (filters.skills.length > 0 ? 1 : 0)

  const clearAll = () =>
    onChange({
      category: null,
      subcategory: null,
      type: null,
      experience: null,
      compensation: null,
      work_mode: null,
      location: null,
      time_commitment: null,
      project_length: null,
      post_age: null,
      skills: [],
      min_budget: null,
      max_budget: null,
    })

  const update = (key: keyof FilterState, value: any) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <DsrtPanel padding="none" variant="default" className="overflow-hidden bg-[#0A0D14] border-white/[0.08]">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-white/[0.06] bg-white/[0.01]">
        <h3 className="text-[13px] font-bold text-white tracking-tight">
          Filters
          {activeCount > 0 && (
            <span className="ml-1.5 text-[#FBBF24] font-mono text-[11px]">({activeCount})</span>
          )}
        </h3>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-[11px] font-mono text-white/50 hover:text-[#FBBF24] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="divide-y divide-white/[0.04]">
        <FilterSection title="Category" defaultOpen>
          <SelectField
            value={filters.category || ''}
            onChange={(v) => update('category', v || null)}
            options={[
              { value: '', label: 'All categories' },
              ...categories.map((c) => ({ value: c.slug, label: c.name })),
            ]}
          />
        </FilterSection>

        <FilterSection title="Opportunity type" defaultOpen>
          <CheckboxList
            value={filters.type}
            options={OPPORTUNITY_TYPES}
            onChange={(v) => update('type', v)}
          />
        </FilterSection>

        <FilterSection title="Experience level" defaultOpen>
          <CheckboxList
            value={filters.experience}
            options={EXPERIENCE_LEVELS}
            onChange={(v) => update('experience', v)}
          />
        </FilterSection>

        <FilterSection title="Compensation">
          <CheckboxList
            value={filters.compensation}
            options={COMPENSATION_TYPES}
            onChange={(v) => update('compensation', v)}
          />
        </FilterSection>

        <FilterSection title="Work mode">
          <CheckboxList
            value={filters.work_mode}
            options={WORK_MODES}
            onChange={(v) => update('work_mode', v)}
          />
        </FilterSection>

        <FilterSection title="Time commitment">
          <SelectField
            value={filters.time_commitment || ''}
            onChange={(v) => update('time_commitment', v || null)}
            options={[{ value: '', label: 'Any' }, ...TIME_COMMITMENTS]}
          />
        </FilterSection>

        <FilterSection title="Project length">
          <SelectField
            value={filters.project_length || ''}
            onChange={(v) => update('project_length', v || null)}
            options={[{ value: '', label: 'Any' }, ...PROJECT_LENGTHS]}
          />
        </FilterSection>

        <FilterSection title="Location">
          <DsrtInput
            type="text"
            value={filters.location || ''}
            onChange={(e) => update('location', e.target.value || null)}
            placeholder="City or remote"
            sizeVariant="sm"
          />
        </FilterSection>

        <FilterSection title="Post age">
          <CheckboxList
            value={filters.post_age}
            options={POST_AGES}
            onChange={(v) => update('post_age', v)}
          />
        </FilterSection>
      </div>
    </DsrtPanel>
  )
}

function FilterSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="px-3.5 py-2.5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left mb-2 group"
      >
        <span className="text-[10px] font-mono font-bold text-white/45 uppercase tracking-wider group-hover:text-white/70 transition-colors">
          {title}
        </span>
        {open ? (
          <CaretUp size={11} className="text-white/40" weight="bold" />
        ) : (
          <CaretDown size={11} className="text-white/40" weight="bold" />
        )}
      </button>
      {open && <div className="pt-0.5">{children}</div>}
    </div>
  )
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-8 pl-3 pr-8 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[12px] text-white focus:outline-none focus:border-[#FBBF24]/50 appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0a0a0f]">
            {o.label}
          </option>
        ))}
      </select>
      <CaretDown
        size={10}
        weight="bold"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
      />
    </div>
  )
}

function CheckboxList({
  value,
  options,
  onChange,
}: {
  value: string | null
  options: { value: string; label: string }[]
  onChange: (v: string | null) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const visibleOptions = showAll ? options : options.slice(0, 5)

  return (
    <div className="space-y-1.5">
      {visibleOptions.map((o) => {
        const isActive = value === o.value
        return (
          <label key={o.value} className="flex items-center gap-2 cursor-pointer group select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => onChange(isActive ? null : o.value)}
              className="w-3.5 h-3.5 rounded border border-white/[0.15] bg-white/[0.03] checked:bg-[#FBBF24] checked:border-[#FBBF24] cursor-pointer accent-[#FBBF24]"
            />
            <span
              className={cn(
                'text-[12px] transition-colors truncate',
                isActive ? 'text-white font-semibold' : 'text-white/55 group-hover:text-white/80'
              )}
            >
              {o.label}
            </span>
          </label>
        )
      })}
      {options.length > 5 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-[10.5px] font-mono text-[#FBBF24] hover:text-[#FCD34D] transition-colors mt-1"
        >
          {showAll ? 'Show less' : `+${options.length - 5} more`}
        </button>
      )}
    </div>
  )
}