'use client'

import React, { useEffect, useState } from 'react'
import { ExploreFilterState, FacetCounts } from '@/lib/venture-explore/types'
import { SECTORS, STAGES, BUSINESS_MODELS, FUNDING_STAGES } from '@/lib/config/sectors'
import { FilterSection } from './FilterSection'

const TEAM_SIZE_OPTIONS = [
  { id: 'solo', label: 'Solo (1)' },
  { id: '2-5', label: '2 – 5' },
  { id: '6-10', label: '6 – 10' },
  { id: '11-25', label: '11 – 25' },
  { id: '26-50', label: '26 – 50' },
  { id: '51-100', label: '51 – 100' },
  { id: '100+', label: '100+' },
]

const VENTURE_TYPE_OPTIONS = [
  { id: 'startup', label: 'Startup' },
  { id: 'company', label: 'Company' },
  { id: 'independent', label: 'Independent business' },
  { id: 'student', label: 'Student venture' },
  { id: 'research', label: 'Research venture' },
  { id: 'nonprofit', label: 'Nonprofit' },
  { id: 'social-enterprise', label: 'Social enterprise' },
  { id: 'creator', label: 'Creator-led business' },
  { id: 'open-source', label: 'Open-source' },
  { id: 'community', label: 'Community venture' },
]

interface FilterSidebarProps {
  filters: ExploreFilterState
  onFilterChange: (newFilters: ExploreFilterState) => void
  onClearFilters: () => void
}

export function FilterSidebar({ filters, onFilterChange, onClearFilters }: FilterSidebarProps) {
  const [facets, setFacets] = useState<FacetCounts>({})

  useEffect(() => {
    fetch('/api/ventures/explore/facets')
      .then(r => r.json())
      .then(d => setFacets(d.facets || {}))
      .catch(() => {})
  }, [])

  const handleArrayToggle = (field: keyof ExploreFilterState, value: string) => {
    const current = (filters[field] as string[]) || []
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]
    onFilterChange({ ...filters, [field]: updated })
  }

  const handleFlagToggle = (field: keyof ExploreFilterState) => {
    onFilterChange({ ...filters, [field]: !filters[field] })
  }

  const hasActiveFilters =
    (filters.domains?.length || 0) > 0 ||
    (filters.stages?.length || 0) > 0 ||
    (filters.business_models?.length || 0) > 0 ||
    (filters.venture_types?.length || 0) > 0 ||
    (filters.team_sizes?.length || 0) > 0 ||
    (filters.funding_stages?.length || 0) > 0 ||
    (filters.locations?.length || 0) > 0 ||
    filters.is_verified ||
    filters.is_hiring ||
    filters.is_seeking_investment ||
    filters.is_seeking_cofounder ||
    filters.is_active_recently ||
    filters.is_newly_launched

  const domainOptions = SECTORS.map(s => ({
    id: s.label,
    label: s.label,
    count: facets.domains?.[s.label.toLowerCase()] || 0,
  })).sort((a, b) => (b.count || 0) - (a.count || 0))

  const stageOptions = STAGES.map(s => ({
    id: s.id,
    label: s.label,
    count: facets.stages?.[s.id] || 0,
  }))

  const businessModelOptions = BUSINESS_MODELS.map(m => ({
    id: m.id,
    label: m.label,
    count: facets.business_models?.[m.id] || 0,
  }))

  const fundingOptions = FUNDING_STAGES.map(f => ({
    id: f.id,
    label: f.label,
    count: facets.funding_stages?.[f.id] || 0,
  }))

  const teamOptions = TEAM_SIZE_OPTIONS.map(t => ({
    ...t,
    count: facets.team_size_ranges?.[t.id] || 0,
  }))

  const ventureTypeOptions = VENTURE_TYPE_OPTIONS.map(t => ({
    ...t,
    count: facets.venture_types?.[t.id] || 0,
  }))

  const locationOptions = facets.locations
    ? Object.entries(facets.locations)
        .map(([loc, cnt]) => ({
          id: loc.trim(),
          label: loc.trim(),
          count: cnt,
        }))
        .filter(o => o.label.length > 1)
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, 30)
    : []

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-bold">
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-[11px] font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <FilterSection
        title="Domain"
        options={domainOptions}
        selectedIds={filters.domains || []}
        onToggle={(id) => handleArrayToggle('domains', id)}
        defaultOpen
        searchable
        maxHeight="280px"
      />

      <FilterSection
        title="Development Stage"
        options={stageOptions}
        selectedIds={filters.stages || []}
        onToggle={(id) => handleArrayToggle('stages', id)}
        defaultOpen
      />

      <FilterSection
        title="Location"
        options={locationOptions}
        selectedIds={filters.locations || []}
        onToggle={(id) => handleArrayToggle('locations', id)}
        searchable
      />

      <FilterSection
        title="Venture Type"
        options={ventureTypeOptions}
        selectedIds={filters.venture_types || []}
        onToggle={(id) => handleArrayToggle('venture_types', id)}
      />

      <FilterSection
        title="Business Model"
        options={businessModelOptions}
        selectedIds={filters.business_models || []}
        onToggle={(id) => handleArrayToggle('business_models', id)}
        searchable
      />

      <FilterSection
        title="Team Size"
        options={teamOptions}
        selectedIds={filters.team_sizes || []}
        onToggle={(id) => handleArrayToggle('team_sizes', id)}
      />

      <FilterSection
        title="Funding Stage"
        options={fundingOptions}
        selectedIds={filters.funding_stages || []}
        onToggle={(id) => handleArrayToggle('funding_stages', id)}
      />

      {/* Activity & Status — RESTRAINED NEUTRAL DESIGN */}
      <div className="pt-3 border-t border-white/[0.04] space-y-2">
        <h4 className="text-[12.5px] font-bold text-white py-1">Activity & Status</h4>
        
        <div className="space-y-1.5 pt-1">
          <FlagCheckbox
            checked={!!filters.is_hiring}
            onChange={() => handleFlagToggle('is_hiring')}
            label="Actively hiring roles"
            count={facets.flags?.hiring}
          />
          <FlagCheckbox
            checked={!!filters.is_seeking_investment}
            onChange={() => handleFlagToggle('is_seeking_investment')}
            label="Seeking investment"
            count={facets.flags?.investment}
          />
          <FlagCheckbox
            checked={!!filters.is_seeking_cofounder}
            onChange={() => handleFlagToggle('is_seeking_cofounder')}
            label="Seeking co-founder"
            count={facets.flags?.cofounder}
          />
          <FlagCheckbox
            checked={!!filters.is_verified}
            onChange={() => handleFlagToggle('is_verified')}
            label="Verified ventures only"
            count={facets.flags?.verified}
          />
          <FlagCheckbox
            checked={!!filters.is_newly_launched}
            onChange={() => handleFlagToggle('is_newly_launched')}
            label="Newly launched (30 days)"
          />
        </div>
      </div>

      <div className="h-2" />
    </div>
  )
}

interface FlagCheckboxProps {
  checked: boolean
  onChange: () => void
  label: string
  count?: number
}

function FlagCheckbox({ checked, onChange, label, count }: FlagCheckboxProps) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-zinc-400 hover:text-white cursor-pointer py-0.5 group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-3.5 h-3.5 rounded bg-zinc-900 border-zinc-700 text-white focus:ring-0 focus:ring-offset-0 cursor-pointer"
      />
      <span className={`flex-1 ${checked ? 'text-white font-medium' : ''}`}>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors">
          {count}
        </span>
      )}
    </label>
  )
}