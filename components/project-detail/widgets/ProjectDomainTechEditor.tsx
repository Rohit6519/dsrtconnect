'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, X, MagnifyingGlass } from '@phosphor-icons/react'

interface Assignment {
  id: string
  domain?: { id: string; name: string; slug: string; category: string }
  technology?: { id: string; name: string; slug: string; category: string }
  is_primary?: boolean
}

interface Props {
  slug: string
  isOwner: boolean
}

export function ProjectDomainTechEditor({ slug, isOwner }: Props) {
  const [domainAssignments, setDomainAssignments] = useState<Assignment[]>([])
  const [techAssignments, setTechAssignments] = useState<Assignment[]>([])
  const [domainSearch, setDomainSearch] = useState('')
  const [techSearch, setTechSearch] = useState('')
  const [domainResults, setDomainResults] = useState<any[]>([])
  const [techResults, setTechResults] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${slug}/domain-assignments`).then(r => r.json()),
      fetch(`/api/projects/${slug}/technology-assignments`).then(r => r.json()),
    ]).then(([d, t]) => {
      setDomainAssignments(d.assignments || [])
      setTechAssignments(t.assignments || [])
    }).catch(() => {})
  }, [slug])

  // Domain autocomplete
  useEffect(() => {
    if (domainSearch.length < 2) { setDomainResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/projects/domains-tree?q=${encodeURIComponent(domainSearch)}&limit=8`)
        .then(r => r.json())
        .then(d => setDomainResults(d.domains || []))
        .catch(() => {})
    }, 200)
    return () => clearTimeout(timer)
  }, [domainSearch])

  // Tech autocomplete
  useEffect(() => {
    if (techSearch.length < 2) { setTechResults([]); return }
    const timer = setTimeout(() => {
      fetch(`/api/projects/technologies?q=${encodeURIComponent(techSearch)}&limit=8`)
        .then(r => r.json())
        .then(d => setTechResults(d.technologies || []))
        .catch(() => {})
    }, 200)
    return () => clearTimeout(timer)
  }, [techSearch])

  const addDomain = async (domainId: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}/domain-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_ids: [domainId] }),
      })
      const d = await res.json()
      if (d.assignments) {
        // Refetch to get full hydrated data
        const freshRes = await fetch(`/api/projects/${slug}/domain-assignments`)
        const fresh = await freshRes.json()
        setDomainAssignments(fresh.assignments || [])
      }
      setDomainSearch('')
      setDomainResults([])
      toast.success('Domain added')
    } catch { toast.error('Failed to add domain') }
  }

  const removeDomain = async (domainId: string) => {
    setDomainAssignments(prev => prev.filter(a => a.domain?.id !== domainId))
    await fetch(`/api/projects/${slug}/domain-assignments?domain_id=${domainId}`, { method: 'DELETE' }).catch(() => {})
  }

  const addTech = async (techId: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}/technology-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technology_ids: [techId] }),
      })
      const d = await res.json()
      if (d.assignments) {
        const freshRes = await fetch(`/api/projects/${slug}/technology-assignments`)
        const fresh = await freshRes.json()
        setTechAssignments(fresh.assignments || [])
      }
      setTechSearch('')
      setTechResults([])
      toast.success('Technology added')
    } catch { toast.error('Failed to add technology') }
  }

  const removeTech = async (techId: string) => {
    setTechAssignments(prev => prev.filter(a => a.technology?.id !== techId))
    await fetch(`/api/projects/${slug}/technology-assignments?technology_id=${techId}`, { method: 'DELETE' }).catch(() => {})
  }

  if (!isOwner && domainAssignments.length === 0 && techAssignments.length === 0) return null

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-[15px] font-semibold text-white">Domains & Technologies</h3>
      </div>

      {/* Domains */}
      <div className="px-4 py-3 border-b border-white/[0.05]">
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-2">Domains</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {domainAssignments.map(a => (
            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/[0.06] border border-white/10 rounded-md text-[11px] text-white/80">
              {a.domain?.name}
              {isOwner && (
                <button onClick={() => removeDomain(a.domain!.id)} className="text-white/40 hover:text-white">
                  <X size={9} />
                </button>
              )}
            </span>
          ))}
        </div>
        {isOwner && (
          <div className="relative">
            <MagnifyingGlass size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={domainSearch}
              onChange={e => setDomainSearch(e.target.value)}
              placeholder="Add domain..."
              className="w-full h-7 pl-6 pr-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
            />
            {domainResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d0d10] border border-white/[0.1] rounded-lg shadow-xl z-10 py-1 max-h-[160px] overflow-y-auto">
                {domainResults.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => addDomain(d.id)}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.04] flex items-center gap-1.5"
                  >
                    <Plus size={9} className="text-white/30" />
                    {d.name}
                    <span className="text-[9px] text-white/30 ml-auto">{d.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Technologies */}
      <div className="px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-white/40 font-bold mb-2">Technologies</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {techAssignments.map(a => (
            <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] text-white/70">
              {a.technology?.name}
              {isOwner && (
                <button onClick={() => removeTech(a.technology!.id)} className="text-white/30 hover:text-white">
                  <X size={9} />
                </button>
              )}
            </span>
          ))}
        </div>
        {isOwner && (
          <div className="relative">
            <MagnifyingGlass size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={techSearch}
              onChange={e => setTechSearch(e.target.value)}
              placeholder="Add technology..."
              className="w-full h-7 pl-6 pr-2 bg-white/[0.03] border border-white/[0.06] rounded-md text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/20"
            />
            {techResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-[#0d0d10] border border-white/[0.1] rounded-lg shadow-xl z-10 py-1 max-h-[160px] overflow-y-auto">
                {techResults.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => addTech(t.id)}
                    className="w-full text-left px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/[0.04] flex items-center gap-1.5"
                  >
                    <Plus size={9} className="text-white/30" />
                    {t.name}
                    <span className="text-[9px] text-white/30 ml-auto">{t.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}