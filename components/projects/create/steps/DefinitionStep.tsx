// components/projects/create/steps/DefinitionStep.tsx
'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlass, X, Plus } from '@phosphor-icons/react'
import { useProjectCreationStore } from '@/stores/projectCreationStore'

export function DefinitionStep() {
  const { data, updateData } = useProjectCreationStore()

  const [domainSearch, setDomainSearch] = useState('')
  const [domainResults, setDomainResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (domainSearch.trim().length < 2) {
      setDomainResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/projects/domains-tree?q=${encodeURIComponent(domainSearch)}&limit=10`)
        const json = await res.json()
        setDomainResults(json.domains || [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [domainSearch])

  const toggleDomain = (domainName: string) => {
    const current = data.domains || []
    if (current.includes(domainName)) {
      const filtered = current.filter(d => d !== domainName)
      updateData({
        domains: filtered,
        primary_domain: data.primary_domain === domainName ? (filtered[0] || '') : data.primary_domain,
      })
    } else {
      if (current.length >= 3) return
      const next = [...current, domainName]
      updateData({
        domains: next,
        primary_domain: data.primary_domain || domainName,
      })
    }
    setDomainSearch('')
  }

  return (
    <div className="space-y-6">
      {/* Full Description */}
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-white/90 block">
          About this project *
        </label>
        <textarea
          autoFocus
          value={data.description || ''}
          onChange={e => updateData({ description: e.target.value })}
          placeholder="Tell people what this project is, why you are building it, and what you hope it will achieve."
          rows={4}
          className="w-full p-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all resize-none leading-relaxed"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Problem */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/90 block">
            Problem Statement (Optional)
          </label>
          <textarea
            value={data.problem_statement || ''}
            onChange={e => updateData({ problem_statement: e.target.value })}
            placeholder="What problem are you trying to solve?"
            rows={3}
            className="w-full p-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-white/90 block">
            Project Goals (Optional)
          </label>
          <textarea
            value={data.goals || ''}
            onChange={e => updateData({ goals: e.target.value })}
            placeholder="What are you trying to build or achieve?"
            rows={3}
            className="w-full p-3 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Domain Taxonomy Selection */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <label className="text-[13px] font-medium text-white/90 block">
          Project Domains * (select up to 3)
        </label>
        <p className="text-[12px] text-white/40">
          Domains classify your project in global search and match you with relevant collaborators.
        </p>

        {/* Active Selected Chips */}
        {(data.domains || []).length > 0 && (
          <div className="space-y-2 mb-2">
            {(data.domains || []).map(d => {
              const isPrimary = data.primary_domain === d
              return (
                <div
                  key={d}
                  className={`flex items-center justify-between p-2.5 rounded-md border ${
                    isPrimary
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-[#0A0A0C] border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-white">{d}</span>
                    {isPrimary && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => updateData({ primary_domain: d })}
                        className="text-[11px] text-white/50 hover:text-white transition-colors"
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleDomain(d)}
                      className="text-white/40 hover:text-white p-0.5"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Autocomplete Search */}
        {(data.domains || []).length < 3 && (
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={domainSearch}
              onChange={e => setDomainSearch(e.target.value)}
              placeholder="Search domains — Electrical Engineering, AI, Computer Vision..."
              className="w-full h-10 pl-9 pr-4 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
            />

            {domainSearch.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0C0C0E] border border-white/10 rounded-md shadow-2xl overflow-hidden z-20 max-h-56 overflow-y-auto">
                {isSearching ? (
                  <div className="p-3 text-center text-[12px] text-white/40">Searching...</div>
                ) : domainResults.length === 0 ? (
                  <div className="p-3 text-center text-[12px] text-white/40">No matching domains found.</div>
                ) : (
                  <ul className="py-1">
                    {domainResults.map(res => (
                      <li key={res.id}>
                        <button
                          type="button"
                          onClick={() => toggleDomain(res.name)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] text-left transition-colors"
                        >
                          <div>
                            <p className="text-[13px] font-medium text-white/90">{res.name}</p>
                            <p className="text-[10px] text-white/40">{res.category}</p>
                          </div>
                          <Plus size={13} className="text-white/30" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}