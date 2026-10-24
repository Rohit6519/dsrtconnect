'use client'

import { useState, useRef, useEffect } from 'react'
import { CaretDown, User, FolderSimple, Rocket, Check } from '@phosphor-icons/react'

interface Props {
  posterContext?: string
  projectId?: string | null
  ventureId?: string | null
  onChange: (context: 'personal' | 'project' | 'venture', id?: string) => void
}

interface Entity {
  id: string
  name: string
  slug?: string
  icon?: string | null
  logo_url?: string | null
  cover_image_url?: string | null
}

export function ContextSelector({ posterContext = 'personal', projectId, ventureId, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [projects, setProjects] = useState<Entity[]>([])
  const [ventures, setVentures] = useState<Entity[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && projects.length === 0 && ventures.length === 0) {
      setLoading(true)
      Promise.all([
        fetch('/api/projects/dashboard').then(r => r.json()).catch(() => ({ projects: [] })),
        fetch('/api/ventures/my').then(r => r.json()).catch(() => ({ ventures: [] })),
      ]).then(([pData, vData]) => {
        setProjects(pData.projects || [])
        setVentures(vData.ventures || [])
      }).finally(() => setLoading(false))
    }
  }, [open, projects.length, ventures.length])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) window.addEventListener('click', handler)
    return () => window.removeEventListener('click', handler)
  }, [open])

  const currentLabel = (() => {
    if (posterContext === 'project' && projectId) {
      const p = projects.find(pr => pr.id === projectId)
      return p?.name || 'Project'
    }
    if (posterContext === 'venture' && ventureId) {
      const v = ventures.find(vt => vt.id === ventureId)
      return v?.name || 'Venture'
    }
    return 'Personal'
  })()

  const currentIcon = (() => {
    if (posterContext === 'project') return <FolderSimple size={11} weight="regular" />
    if (posterContext === 'venture') return <Rocket size={11} weight="regular" />
    return <User size={11} weight="regular" />
  })()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-8 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-950 text-[12px] font-medium text-zinc-200 transition-colors"
      >
        {currentIcon}
        <span className="max-w-[160px] truncate">{currentLabel}</span>
        <CaretDown size={9} weight="bold" className="text-zinc-500" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-72 rounded-lg border border-zinc-800 bg-[#0f0f0f] shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-40 overflow-hidden">
          {/* Personal */}
          <button
            onClick={() => { onChange('personal'); setOpen(false) }}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
              <User size={13} weight="regular" className="text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold text-zinc-200">Personal</div>
              <div className="text-[10.5px] text-zinc-500">Post as yourself</div>
            </div>
            {posterContext === 'personal' && (
              <Check size={12} weight="bold" className="text-blue-400 shrink-0" />
            )}
          </button>

          {/* Projects */}
          {projects.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-t border-zinc-800 bg-zinc-950/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your Projects</span>
              </div>
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onChange('project', p.id); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {p.cover_image_url ? (
                      <img src={p.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : p.icon ? (
                      <span className="text-sm">{p.icon}</span>
                    ) : (
                      <FolderSimple size={13} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-zinc-200 truncate">{p.name}</div>
                    <div className="text-[10.5px] text-zinc-500">Project</div>
                  </div>
                  {posterContext === 'project' && projectId === p.id && (
                    <Check size={12} weight="bold" className="text-blue-400 shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}

          {/* Ventures */}
          {ventures.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-t border-zinc-800 bg-zinc-950/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Your Ventures</span>
              </div>
              {ventures.map(v => (
                <button
                  key={v.id}
                  onClick={() => { onChange('venture', v.id); setOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-900 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Rocket size={13} className="text-zinc-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-semibold text-zinc-200 truncate">{v.name}</div>
                    <div className="text-[10.5px] text-zinc-500">Venture</div>
                  </div>
                  {posterContext === 'venture' && ventureId === v.id && (
                    <Check size={12} weight="bold" className="text-blue-400 shrink-0" />
                  )}
                </button>
              ))}
            </>
          )}

          {loading && (
            <div className="px-3 py-3 text-[11.5px] text-zinc-500 text-center">
              Loading...
            </div>
          )}
        </div>
      )}
    </div>
  )
}