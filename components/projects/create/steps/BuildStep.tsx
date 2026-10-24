// components/projects/create/steps/BuildStep.tsx
'use client'

import { useState, useEffect } from 'react'
import { MagnifyingGlass, X, Plus, GithubLogo, Globe, Eye, EyeSlash } from '@phosphor-icons/react'
import { useProjectCreationStore } from '@/stores/projectCreationStore'

const STAGES = [
  { id: 'idea', label: 'Idea', desc: 'Just starting out' },
  { id: 'research', label: 'Research', desc: 'Exploring feasibility' },
  { id: 'planning', label: 'Planning', desc: 'Architecture & roadmap' },
  { id: 'prototype', label: 'Prototype', desc: 'Proof of concept' },
  { id: 'development', label: 'Development', desc: 'Actively building' },
  { id: 'testing', label: 'Testing', desc: 'QA & validation' },
  { id: 'mvp', label: 'MVP', desc: 'Ready for users' },
  { id: 'launched', label: 'Launched', desc: 'Publicly live' },
]

export function BuildStep() {
  const { data, updateData } = useProjectCreationStore()
  
  const [techSearch, setTechSearch] = useState('')
  const [techResults, setTechResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (techSearch.trim().length < 2) {
      setTechResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/projects/technologies?q=${encodeURIComponent(techSearch)}&limit=10`)
        const json = await res.json()
        setTechResults(json.technologies || [])
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [techSearch])

  const addTech = (techName: string) => {
    const current = data.technologies || []
    if (current.includes(techName) || current.length >= 10) return
    updateData({ technologies: [...current, techName] })
    setTechSearch('')
    setTechResults([])
  }

  const removeTech = (techName: string) => {
    const current = data.technologies || []
    updateData({ technologies: current.filter(t => t !== techName) })
  }

  return (
    <div className="space-y-6">
      {/* Current Stage */}
      <div className="space-y-2">
        <label className="text-[13px] font-medium text-white/90 block">
          Current Stage *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STAGES.map(s => {
            const active = data.stage === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => updateData({ stage: s.id })}
                className={`p-2.5 rounded-md border text-left transition-all ${
                  active 
                    ? 'bg-white/[0.06] border-white/30 text-white' 
                    : 'bg-[#050505] border-white/10 text-white/60 hover:bg-white/[0.02] hover:text-white'
                }`}
              >
                <p className="text-[12px] font-semibold">{s.label}</p>
                <p className="text-[10px] text-white/40 mt-0.5 leading-tight">{s.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <label className="text-[13px] font-medium text-white/90 block">
          Technologies & Tools (Optional, up to 10)
        </label>
        
        {(data.technologies || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(data.technologies || []).map(t => (
              <span key={t} className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#4F7CFF]/10 border border-[#4F7CFF]/25 text-[12px] font-medium text-[#7B99FF]">
                {t}
                <button type="button" onClick={() => removeTech(t)} className="text-white/40 hover:text-white">
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {(data.technologies || []).length < 10 && (
          <div className="relative">
            <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={techSearch}
              onChange={e => setTechSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && techSearch.trim()) {
                  e.preventDefault()
                  addTech(techSearch.trim())
                }
              }}
              placeholder="Search or type tech (e.g. Python, PyTorch, React)..."
              className="w-full h-10 pl-9 pr-4 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
            />
            
            {techSearch.trim().length >= 2 && techResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0C0C0E] border border-white/10 rounded-md shadow-2xl overflow-hidden z-20 max-h-48 overflow-y-auto py-1">
                {techResults.map(res => (
                  <button
                    key={res.id}
                    type="button"
                    onClick={() => addTech(res.name)}
                    className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-white/[0.04] text-left transition-colors"
                  >
                    <span className="text-[13px] text-white/90">{res.name}</span>
                    <Plus size={12} className="text-white/30" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Source Code & Repository */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <label className="text-[13px] font-medium text-white/90 block">
          Source Repository (Optional)
        </label>
        
        <div className="relative">
          <GithubLogo size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={data.repository_url || ''}
            onChange={e => updateData({ repository_url: e.target.value })}
            placeholder="Repository URL (e.g. https://github.com/username/repo)"
            className="w-full h-10 pl-9 pr-4 rounded-md bg-[#050505] border border-white/10 text-white text-[13px] placeholder:text-white/30 focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={data.is_open_source || false}
              onChange={e => updateData({ is_open_source: e.target.checked })}
              className="w-4 h-4 rounded bg-[#050505] border-white/20 text-[#4F7CFF] focus:ring-0 cursor-pointer"
            />
            <span className="text-[13px] text-white/80">This project is open source</span>
          </label>
        </div>

        {data.is_open_source && (
          <div className="pt-1">
            <select
              value={data.license || ''}
              onChange={e => updateData({ license: e.target.value })}
              className="h-9 px-3 bg-[#050505] border border-white/10 rounded-md text-[12px] text-white outline-none focus:border-[#4F7CFF]"
            >
              <option value="">Select license...</option>
              <option value="MIT">MIT License</option>
              <option value="Apache-2.0">Apache 2.0</option>
              <option value="GPL-3.0">GNU GPL v3</option>
              <option value="BSD-3-Clause">BSD 3-Clause</option>
            </select>
          </div>
        )}
      </div>

      {/* Initial Visibility */}
      <div className="pt-4 border-t border-white/[0.06] space-y-3">
        <label className="text-[13px] font-medium text-white/90 block">
          Visibility Settings
        </label>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { id: 'public', label: 'Public', desc: 'Visible on DSRT', icon: Globe },
            { id: 'unlisted', label: 'Unlisted', desc: 'Direct link only', icon: Eye },
            { id: 'private', label: 'Private', desc: 'Team members only', icon: EyeSlash }
          ].map(opt => {
            const active = data.visibility === opt.id
            const Icon = opt.icon
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateData({ visibility: opt.id as any })}
                className={`p-3 rounded-md border text-left transition-all ${
                  active 
                    ? 'bg-white/[0.06] border-white/30 text-white' 
                    : 'bg-[#050505] border-white/10 text-white/60 hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={14} className={active ? 'text-white' : 'text-white/40'} />
                  <span className="text-[12px] font-semibold">{opt.label}</span>
                </div>
                <p className="text-[10px] text-white/40 leading-tight">{opt.desc}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}