'use client'

import { useState, useEffect } from 'react'
import { CaretRight } from '@phosphor-icons/react'

interface Props {
  onCategoryPick: (slug: string) => void
}

export function CategoriesTab({ onCategoryPick }: Props) {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/opportunities/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-32 rounded-xl border border-zinc-800 bg-zinc-950/40 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-zinc-500 mb-4">
        Browse opportunities by category. Click any category to filter the Explore feed.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onCategoryPick(cat.slug)}
            className="group text-left rounded-xl border border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/70 p-5 transition-all shadow-[0_2px_12px_rgba(0,0,0,0.25)]"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="text-[15px] font-bold text-white group-hover:text-blue-400 transition-colors">
                {cat.name}
              </h3>
              <CaretRight size={11} weight="bold" className="text-zinc-600 group-hover:text-blue-400 mt-1 shrink-0" />
            </div>
            {cat.description && (
              <p className="text-[11.5px] text-zinc-500 mb-3 leading-relaxed line-clamp-2">
                {cat.description}
              </p>
            )}
            {cat.subcategories && cat.subcategories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {cat.subcategories.slice(0, 4).map((s: any) => (
                  <span key={s.id} className="inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
                    {s.name}
                  </span>
                ))}
                {cat.subcategories.length > 4 && (
                  <span className="text-[10.5px] text-zinc-600">+{cat.subcategories.length - 4}</span>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}