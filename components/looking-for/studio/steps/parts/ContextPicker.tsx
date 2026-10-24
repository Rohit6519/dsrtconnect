'use client'

import { useState, useEffect, useRef } from 'react'
import { User, FolderSimple, Rocket, UsersThree, CaretDown } from '@phosphor-icons/react'
import { useStudio } from '../../StudioContext'

export function ContextPicker() {
  const { draft, updateField } = useStudio()
  const [targets, setTargets] = useState<{ projects: any[], ventures: any[], communities: any[] } | null>(null)
  
  const ctx = draft.opportunity.poster_context || 'personal'
  const projId = draft.opportunity.project_id
  const ventId = draft.opportunity.venture_id
  const commId = draft.opportunity.community_id

  useEffect(() => {
    fetch('/api/opportunities/dashboard/distribution-targets')
      .then(r => r.json())
      .then(d => setTargets(d))
      .catch(() => setTargets({ projects: [], ventures: [], communities: [] }))
  }, [])

  const setPersonal = () => {
    updateField({
      poster_context: 'personal',
      project_id: null,
      venture_id: null,
      community_id: null,
      organization_id: null,
    })
  }

  const setTarget = (type: 'project' | 'venture' | 'community', id: string) => {
    updateField({
      poster_context: type,
      project_id: type === 'project' ? id : null,
      venture_id: type === 'venture' ? id : null,
      community_id: type === 'community' ? id : null,
      organization_id: null,
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ContextModeBtn active={ctx === 'personal'} onClick={setPersonal} icon={User} label="Personal" />
        <ContextModeBtn active={ctx === 'project'} onClick={() => ctx !== 'project' && setTarget('project', targets?.projects?.[0]?.id || '')} icon={FolderSimple} label="Project" disabled={!targets?.projects?.length} />
        <ContextModeBtn active={ctx === 'venture'} onClick={() => ctx !== 'venture' && setTarget('venture', targets?.ventures?.[0]?.id || '')} icon={Rocket} label="Venture" disabled={!targets?.ventures?.length} />
        <ContextModeBtn active={ctx === 'community'} onClick={() => ctx !== 'community' && setTarget('community', targets?.communities?.[0]?.id || '')} icon={UsersThree} label="Community" disabled={!targets?.communities?.length} />
      </div>

      {/* Custom Styled Dropdowns */}
      {ctx === 'project' && targets?.projects && targets.projects.length > 0 && (
        <CustomDropdown items={targets.projects} value={projId} onChange={(id) => setTarget('project', id)} placeholder="Select project..." />
      )}
      {ctx === 'venture' && targets?.ventures && targets.ventures.length > 0 && (
        <CustomDropdown items={targets.ventures} value={ventId} onChange={(id) => setTarget('venture', id)} placeholder="Select venture..." />
      )}
      {ctx === 'community' && targets?.communities && targets.communities.length > 0 && (
        <CustomDropdown items={targets.communities} value={commId} onChange={(id) => setTarget('community', id)} placeholder="Select community..." />
      )}
    </div>
  )
}

function ContextModeBtn({ active, onClick, icon: Icon, label, disabled }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'flex items-center gap-2 p-3 rounded-xl border transition-all text-left ' +
        (disabled 
          ? 'border-zinc-800/50 bg-zinc-950/20 text-zinc-600 cursor-not-allowed opacity-50' 
          : active 
            ? 'border-white/20 bg-white/10 text-white shadow-sm' 
            : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-white hover:border-zinc-600')
      }
    >
      <Icon size={16} weight={active ? 'fill' : 'regular'} className={active ? 'text-white' : 'text-zinc-500'} />
      <span className="text-[12px] font-semibold">{label}</span>
    </button>
  )
}

// BEAUTIFUL CUSTOM DROPDOWN
function CustomDropdown({ items, value, onChange, placeholder }: { items: any[], value: string, onChange: (id: string) => void, placeholder: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const current = items.find(i => i.id === value)

  return (
    <div className="relative w-full max-w-md" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13px] transition-colors focus:border-zinc-600 focus:outline-none"
      >
        <span className={current ? 'text-zinc-200 font-medium' : 'text-zinc-500'}>
          {current ? current.name : placeholder}
        </span>
        <CaretDown size={14} className="text-zinc-500" weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40 p-1.5 max-h-60 overflow-y-auto">
          {items.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => { onChange(i.id); setOpen(false) }}
              className={'w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors ' + (value === i.id ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')}
            >
              {i.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}