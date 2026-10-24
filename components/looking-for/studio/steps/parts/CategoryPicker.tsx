'use client'

import { useState, useEffect, useRef } from 'react'
import { CaretDown, CaretRight, CheckCircle } from '@phosphor-icons/react'
import { useStudio } from '../../StudioContext'

export function CategoryPicker() {
  const { draft, updateField } = useStudio()
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activePrimary, setActivePrimary] = useState<any | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const primaryId = draft.opportunity.primary_category_id
  const subId = draft.opportunity.subcategory_id

  useEffect(() => {
    fetch('/api/opportunities/categories?flat=false')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  // Find labels for the trigger button
  const currentPrimary = categories.find(c => c.id === primaryId)
  const currentSub = currentPrimary?.subcategories?.find((s: any) => s.id === subId)
  
  const displayLabel = currentPrimary
    ? currentSub 
      ? `${currentPrimary.name} → ${currentSub.name}`
      : currentPrimary.name
    : 'Select category...'

  const selectCategory = (primary: any, sub: any | null = null) => {
    updateField({
      primary_category_id: primary.id,
      subcategory_id: sub ? sub.id : null
    })
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13px] transition-colors focus:border-zinc-600 focus:outline-none"
      >
        <span className={currentPrimary ? 'text-zinc-100 font-medium' : 'text-zinc-600'}>
          {loading ? 'Loading categories...' : displayLabel}
        </span>
        <CaretDown size={14} weight="bold" className="text-zinc-500" />
      </button>

      {open && categories.length > 0 && (
        <div className="absolute left-0 top-full mt-2 w-full max-w-[500px] rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40 flex overflow-hidden max-h-[340px]">
          {/* Left Column - Primary Categories */}
          <div className="w-1/2 flex flex-col border-r border-zinc-800/80 bg-zinc-950/50 overflow-y-auto">
            {categories.map(c => {
              const isSelected = c.id === primaryId
              const isActive = activePrimary?.id === c.id
              const hasSubs = c.subcategories && c.subcategories.length > 0
              
              return (
                <button
                  key={c.id}
                  onMouseEnter={() => hasSubs && setActivePrimary(c)}
                  onClick={() => !hasSubs && selectCategory(c)}
                  className={
                    'flex items-center justify-between px-4 py-3 text-left transition-colors ' +
                    (isActive ? 'bg-zinc-900' : 'hover:bg-zinc-900/50')
                  }
                >
                  <span className={'text-[12.5px] ' + (isSelected ? 'text-white font-bold' : 'text-zinc-300 font-medium')}>
                    {c.name}
                  </span>
                  {hasSubs && <CaretRight size={12} weight="bold" className="text-zinc-600" />}
                </button>
              )
            })}
          </div>

          {/* Right Column - Subcategories */}
          <div className="w-1/2 flex flex-col overflow-y-auto bg-[#0c0c0e]">
            {!activePrimary ? (
              <div className="flex-1 flex items-center justify-center p-6 text-center text-[12px] text-zinc-600">
                Hover over a category to see specializations.
              </div>
            ) : (
              <div>
                <div className="px-4 py-2.5 border-b border-zinc-800/80 text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 bg-zinc-950/30">
                  {activePrimary.name}
                </div>
                <button
                  onClick={() => selectCategory(activePrimary, null)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors"
                >
                  {primaryId === activePrimary.id && !subId && <CheckCircle size={14} weight="fill" className="text-emerald-400" />}
                  <span className={'text-[12.5px] ' + (primaryId === activePrimary.id && !subId ? 'text-white font-bold' : 'text-zinc-300 font-medium')}>
                    General / Any
                  </span>
                </button>
                {activePrimary.subcategories?.map((s: any) => {
                  const isSelected = subId === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => selectCategory(activePrimary, s)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors"
                    >
                      {isSelected && <CheckCircle size={14} weight="fill" className="text-emerald-400" />}
                      <span className={'text-[12.5px] ' + (isSelected ? 'text-white font-bold' : 'text-zinc-300 font-medium')}>
                        {s.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}