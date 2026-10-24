'use client'

import { useEffect, useState } from 'react'
import { ExploreProjectFilterState, ProjectFacetCounts } from '@/lib/project-explore/types'
import { ProjectFilterSection } from './ProjectFilterSection'

interface Props {
  filters: ExploreProjectFilterState
  onFilterChange: (newFilters: ExploreProjectFilterState) => void
  onClearFilters: () => void
}

const STAGE_OPTIONS = [
  { id: 'idea', label: 'Idea' },
  { id: 'planning', label: 'Planning' },
  { id: 'prototype', label: 'Prototype' },
  { id: 'development', label: 'Development' },
  { id: 'testing', label: 'Testing' },
  { id: 'mvp', label: 'MVP' },
  { id: 'launched', label: 'Launched' },
  { id: 'maintaining', label: 'Maintaining' },
  { id: 'completed', label: 'Completed' },
  { id: 'research', label: 'Research' },
]

const PROJECT_TYPE_OPTIONS = [
  { id: 'personal', label: 'Personal project' },
  { id: 'startup', label: 'Startup / Venture' },
  { id: 'product', label: 'Product' },
  { id: 'research', label: 'Research' },
  { id: 'open-source', label: 'Open source' },
  { id: 'hackathon', label: 'Hackathon build' },
  { id: 'community', label: 'Community initiative' },
  { id: 'social-impact', label: 'Social impact' },
  { id: 'learning', label: 'Learning project' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'experiment', label: 'Experiment' },
  { id: 'other', label: 'Other' },
]

const LICENSE_OPTIONS = [
  { id: 'mit', label: 'MIT' },
  { id: 'apache-2.0', label: 'Apache 2.0' },
  { id: 'gpl', label: 'GPL' },
  { id: 'gpl-3.0', label: 'GPL v3' },
  { id: 'bsd', label: 'BSD' },
  { id: 'mpl', label: 'MPL' },
  { id: 'agpl', label: 'AGPL' },
  { id: 'unlicense', label: 'Unlicense' },
]

export function ProjectFilterSidebar({ filters, onFilterChange, onClearFilters }: Props) {
  const [facets, setFacets] = useState<ProjectFacetCounts>({})
  const [domainOptions, setDomainOptions] = useState<{ id: string; label: string; count?: number }[]>([])
  const [technologyOptions, setTechnologyOptions] = useState<{ id: string; label: string; count?: number }[]>([])

  // ─── Load facets + top domains + top technologies ───
  useEffect(() => {
    Promise.all([
      fetch('/api/projects/explore/facets').then(r => r.json()).catch(() => ({ facets: {} })),
      fetch('/api/projects/domains-tree?limit=80').then(r => r.json()).catch(() => ({ domains: [] })),
      fetch('/api/projects/technologies?limit=80').then(r => r.json()).catch(() => ({ technologies: [] })),
    ]).then(([facetRes, domainRes, techRes]) => {
      const facetData: ProjectFacetCounts = facetRes.facets || {}
      setFacets(facetData)

      const domainCounts = facetData.domains || {}
      const domains = (domainRes.domains || []).map((d: any) => ({
        id: d.name,
        label: d.name,
        count: domainCounts[d.name.toLowerCase()] || 0,
      })).sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      setDomainOptions(domains)

      const techCounts = facetData.technologies || {}
      const technologies = (techRes.technologies || []).map((t: any) => ({
        id: t.name,
        label: t.name,
        count: techCounts[t.name.toLowerCase()] || 0,
      })).sort((a: any, b: any) => (b.count || 0) - (a.count || 0))
      setTechnologyOptions(technologies)
    })
  }, [])

  const handleArrayToggle = (field: keyof ExploreProjectFilterState, value: string) => {
    const current = (filters[field] as string[]) || []
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value]
    onFilterChange({ ...filters, [field]: updated })
  }

  const handleFlagToggle = (field: keyof ExploreProjectFilterState) => {
    onFilterChange({ ...filters, [field]: !filters[field] })
  }

  const hasActiveFilters =
    (filters.domains?.length || 0) > 0 ||
    (filters.technologies?.length || 0) > 0 ||
    (filters.stages?.length || 0) > 0 ||
    (filters.project_types?.length || 0) > 0 ||
    (filters.licenses?.length || 0) > 0 ||
    (filters.locations?.length || 0) > 0 ||
    filters.is_open_source ||
    filters.is_hiring ||
    filters.is_looking_for_collaborators ||
    filters.is_verified ||
    filters.is_newly_launched ||
    filters.has_repository

  // Enriched stage options with counts
  const stageOptions = STAGE_OPTIONS.map(s => ({
    ...s,
    count: facets.stages?.[s.id] || 0,
  }))

  const projectTypeOptions = PROJECT_TYPE_OPTIONS.map(t => ({
    ...t,
    count: facets.project_types?.[t.id] || 0,
  }))

  const licenseOptions = LICENSE_OPTIONS.map(l => ({
    ...l,
    count: facets.licenses?.[l.id] || 0,
  }))

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

      <ProjectFilterSection
        title="Domain"
        options={domainOptions}
        selectedIds={filters.domains || []}
        onToggle={id => handleArrayToggle('domains', id)}
        defaultOpen
        searchable
        maxHeight="280px"
      />

      <ProjectFilterSection
        title="Technology"
        options={technologyOptions}
        selectedIds={filters.technologies || []}
        onToggle={id => handleArrayToggle('technologies', id)}
        defaultOpen
        searchable
        maxHeight="280px"
      />

      <ProjectFilterSection
        title="Stage"
        options={stageOptions}
        selectedIds={filters.stages || []}
        onToggle={id => handleArrayToggle('stages', id)}
      />

      <ProjectFilterSection
        title="Project Type"
        options={projectTypeOptions}
        selectedIds={filters.project_types || []}
        onToggle={id => handleArrayToggle('project_types', id)}
      />

      <ProjectFilterSection
        title="License"
        options={licenseOptions}
        selectedIds={filters.licenses || []}
        onToggle={id => handleArrayToggle('licenses', id)}
      />

      {/* Activity & Status Flags — restrained neutral design */}
      <div className="pt-3 border-t border-white/[0.04] space-y-2">
        <h4 className="text-[12.5px] font-bold text-white py-1">Activity & Status</h4>

        <div className="space-y-1.5 pt-1">
          <FlagCheckbox
            checked={!!filters.is_open_source}
            onChange={() => handleFlagToggle('is_open_source')}
            label="Open source"
            count={facets.flags?.open_source}
          />
          <FlagCheckbox
            checked={!!filters.is_looking_for_collaborators}
            onChange={() => handleFlagToggle('is_looking_for_collaborators')}
            label="Looking for collaborators"
            count={facets.flags?.looking_for_collaborators}
          />
          <FlagCheckbox
            checked={!!filters.is_hiring}
            onChange={() => handleFlagToggle('is_hiring')}
            label="Actively hiring roles"
            count={facets.flags?.hiring}
          />
          <FlagCheckbox
            checked={!!filters.is_verified}
            onChange={() => handleFlagToggle('is_verified')}
            label="DSRT Verified only"
            count={facets.flags?.dsrt_verified}
          />
          <FlagCheckbox
            checked={!!filters.has_repository}
            onChange={() => handleFlagToggle('has_repository')}
            label="Has repository"
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

function FlagCheckbox({
  checked,
  onChange,
  label,
  count,
}: {
  checked: boolean
  onChange: () => void
  label: string
  count?: number
}) {
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