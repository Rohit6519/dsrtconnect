'use client'

import { useEffect } from 'react'
import { X, FunnelSimple } from '@phosphor-icons/react'
import { ExploreProjectFilterState } from '@/lib/project-explore/types'
import { ProjectFilterSidebar } from './ProjectFilterSidebar'

interface Props {
  open: boolean
  onClose: () => void
  filters: ExploreProjectFilterState
  onFilterChange: (newFilters: ExploreProjectFilterState) => void
  onClearFilters: () => void
  activeCount: number
}

export function ProjectMobileFilterDrawer({
  open,
  onClose,
  filters,
  onFilterChange,
  onClearFilters,
  activeCount,
}: Props) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full bg-[#0d0d10] border-t border-white/[0.1] rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.08] shrink-0">
          <div className="flex items-center gap-2">
            <FunnelSimple size={16} weight="bold" className="text-white" />
            <h3 className="text-[14px] font-bold text-white">Filters</h3>
            {activeCount > 0 && (
              <span className="text-[10px] font-mono text-white bg-white/[0.08] border border-white/15 rounded px-1.5 py-0.5">
                {activeCount} active
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          >
            <X size={16} weight="bold" className="text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ProjectFilterSidebar
            filters={filters}
            onFilterChange={onFilterChange}
            onClearFilters={onClearFilters}
          />
        </div>

        <div className="flex gap-2 p-4 border-t border-white/[0.08] shrink-0">
          <button
            onClick={onClearFilters}
            className="flex-1 h-11 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-semibold text-[13px] transition-colors"
          >
            Clear all
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-lg bg-white text-black hover:bg-zinc-200 font-bold text-[13px] transition-colors"
          >
            Show results
          </button>
        </div>
      </div>
    </div>
  )
}