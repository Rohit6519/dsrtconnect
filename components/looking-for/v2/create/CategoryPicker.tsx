'use client'

import { useState, useEffect } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'

interface Category {
  id: string
  name: string
  slug: string
  subcategories?: Category[]
}

interface Props {
  primaryId?: string | null
  subcategoryId?: string | null
  onChange: (primaryId: string | null, subcategoryId: string | null) => void
}

export function CategoryPicker({ primaryId, subcategoryId, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [open, setOpen] = useState<'primary' | 'sub' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/opportunities/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const primaryCat = categories.find(c => c.id === primaryId)
  const subCat = primaryCat?.subcategories?.find(s => s.id === subcategoryId)

  return (
    <div className="space-y-2">
      {/* Primary */}
      <div className="relative">
        <button
          onClick={() => setOpen(open === 'primary' ? null : 'primary')}
          className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 hover:border-zinc-700 focus:outline-none flex items-center justify-between"
        >
          <span className={primaryCat ? 'text-zinc-200' : 'text-zinc-500'}>
            {primaryCat?.name || 'Select category'}
          </span>
          <CaretDown size={10} weight="bold" className="text-zinc-500" />
        </button>
        {open === 'primary' && (
          <div className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-md border border-zinc-800 bg-[#0f0f0f] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-30">
            {loading ? (
              <div className="px-3 py-2 text-[11.5px] text-zinc-500">Loading...</div>
            ) : (
              categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onChange(c.id, null)
                    setOpen(null)
                  }}
                  className={
                    'w-full text-left px-3 py-2 text-[12.5px] transition-colors ' +
                    (primaryId === c.id
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')
                  }
                >
                  {c.name}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Subcategory */}
      {primaryCat && primaryCat.subcategories && primaryCat.subcategories.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setOpen(open === 'sub' ? null : 'sub')}
            className="w-full h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-200 hover:border-zinc-700 focus:outline-none flex items-center justify-between"
          >
            <span className={subCat ? 'text-zinc-200' : 'text-zinc-500'}>
              {subCat?.name || 'Subcategory (optional)'}
            </span>
            <CaretDown size={10} weight="bold" className="text-zinc-500" />
          </button>
          {open === 'sub' && (
            <div className="absolute left-0 right-0 top-full mt-1 max-h-72 overflow-y-auto rounded-md border border-zinc-800 bg-[#0f0f0f] shadow-[0_8px_24px_rgba(0,0,0,0.5)] z-30">
              <button
                onClick={() => { onChange(primaryCat.id, null); setOpen(null) }}
                className="w-full text-left px-3 py-2 text-[12px] text-zinc-500 hover:bg-zinc-900 italic"
              >
                None
              </button>
              {primaryCat.subcategories.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onChange(primaryCat.id, s.id); setOpen(null) }}
                  className={
                    'w-full text-left px-3 py-2 text-[12.5px] transition-colors ' +
                    (subcategoryId === s.id
                      ? 'bg-zinc-900 text-white font-semibold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')
                  }
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}