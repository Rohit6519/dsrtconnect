'use client'

import { useState, useEffect } from 'react'
import { PencilSimple, Plus, X } from '@phosphor-icons/react'

interface Props {
  onCategorySelect?: (slug: string) => void
}

interface Category {
  id: string
  name: string
  slug: string
  icon?: string | null
}

export function MyCategoriesPanel({ onCategorySelect }: Props) {
  const [categories, setCategories] = useState<Category[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [editing, setEditing] = useState(false)
  const [showAddPicker, setShowAddPicker] = useState(false)
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    loadUserCategories()
    loadAllCategories()
  }, [])

  const loadUserCategories = async () => {
    try {
      const res = await fetch('/api/explore/preferences')
      const data = await res.json()
      const catNames = (data.preferred_categories || []) as string[]
      if (catNames.length === 0) return

      // Fetch full category records
      const allRes = await fetch('/api/opportunities/categories?flat=true')
      const allData = await allRes.json()
      const allCats = (allData.categories || []) as Category[]

      const namesLower = catNames.map(n => n.toLowerCase())
      const matched = allCats.filter(c => namesLower.includes(c.name.toLowerCase()))
      setCategories(matched)
    } catch { }
  }

  const loadAllCategories = async () => {
    try {
      const res = await fetch('/api/opportunities/categories?flat=true')
      const data = await res.json()
      setAllCategories((data.categories || []).filter((c: Category) => !!c.name))
    } catch { }
  }

  const addCategory = async (cat: Category) => {
    if (categories.some(c => c.id === cat.id)) return
    const next = [...categories, cat]
    setCategories(next)
    setShowAddPicker(false)
    setSearchQ('')
    try {
      await fetch('/api/explore/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_categories: next.map(c => c.name),
        }),
      })
    } catch { }
  }

  const removeCategory = async (id: string) => {
    const next = categories.filter(c => c.id !== id)
    setCategories(next)
    try {
      await fetch('/api/explore/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferred_categories: next.map(c => c.name),
        }),
      })
    } catch { }
  }

  const filteredForPicker = searchQ
    ? allCategories.filter(c =>
        c.name.toLowerCase().includes(searchQ.toLowerCase()) &&
        !categories.some(uc => uc.id === c.id)
      ).slice(0, 8)
    : allCategories
        .filter(c => !categories.some(uc => uc.id === c.id))
        .slice(0, 8)

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-bold text-white">My Categories</h3>
        <button
          onClick={() => setEditing(!editing)}
          className="w-6 h-6 rounded flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
        >
          <PencilSimple size={11} />
        </button>
      </div>

      {categories.length === 0 && !editing && (
        <p className="text-[12px] text-zinc-500 py-2">
          No categories yet. Click ✎ to personalize your feed.
        </p>
      )}

      <div className="space-y-1">
        {categories.map(c => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 group"
          >
            <button
              onClick={() => onCategorySelect?.(c.slug)}
              className="flex-1 text-left px-2 py-1.5 rounded text-[12.5px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors truncate"
            >
              {c.name}
            </button>
            {editing && (
              <button
                onClick={() => removeCategory(c.id)}
                className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-red-400"
              >
                <X size={9} weight="bold" />
              </button>
            )}
          </div>
        ))}
      </div>

      {(editing || categories.length === 0) && (
        <div className="mt-3">
          {!showAddPicker ? (
            <button
              onClick={() => setShowAddPicker(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded text-[12px] font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              <Plus size={11} weight="bold" /> Add Category
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                autoFocus
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search categories..."
                className="w-full h-8 px-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-[12px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
              />
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {filteredForPicker.map(c => (
                  <button
                    key={c.id}
                    onClick={() => addCategory(c)}
                    className="w-full text-left px-2 py-1.5 rounded text-[12px] text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors truncate"
                  >
                    {c.name}
                  </button>
                ))}
                {filteredForPicker.length === 0 && (
                  <p className="text-[11.5px] text-zinc-500 px-2 py-1">No matches</p>
                )}
              </div>
              <button
                onClick={() => { setShowAddPicker(false); setSearchQ('') }}
                className="w-full text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}