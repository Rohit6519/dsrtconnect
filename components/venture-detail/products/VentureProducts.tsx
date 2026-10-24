'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Package } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ProductSection } from './ProductSection'

interface Props {
  venture: any
  products: any[]
  slug: string
  isOwner: boolean
}

export function VentureProducts({ venture, products: initialProducts, slug, isOwner }: Props) {
  const [sections, setSections] = useState<any[]>(initialProducts || [])
  const [creating, setCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [autoCreateAttempted, setAutoCreateAttempted] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/ventures/' + slug + '/products')
      const j = await res.json()
      setSections(j.products || [])
    } catch {}
    finally { setLoading(false) }
  }, [slug])

  useEffect(() => {
    if (initialProducts.length === 0) refresh()
    else setLoading(false)
  }, [])

  // Auto-create Section 1 if owner and no sections exist
  useEffect(() => {
    if (loading || !isOwner || autoCreateAttempted) return
    if (sections.length === 0) {
      setAutoCreateAttempted(true)
      addSection(true)
    }
  }, [loading, sections.length, isOwner, autoCreateAttempted])

  const addSection = async (silent = false) => {
    setCreating(true)
    try {
      const res = await fetch('/api/ventures/' + slug + '/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          description: '',
          position: sections.length,
          status: 'building',
          is_public: true,
        }),
      })
      if (!res.ok) throw new Error()
      const j = await res.json()
      setSections(prev => [...prev, j.product])
      if (!silent) toast.success('Section added')
    } catch {
      if (!silent) toast.error('Failed to add section')
    } finally {
      setCreating(false)
    }
  }

  const deleteSection = async (id: string) => {
    if (!confirm('Delete this product section? This cannot be undone.')) return
    try {
      await fetch('/api/ventures/' + slug + '/products?id=' + id, { method: 'DELETE' })
      setSections(sections.filter(s => s.id !== id))
      toast.success('Section removed')
    } catch {
      toast.error('Failed to remove')
    }
  }

  const updateSection = async (id: string, patch: any) => {
    // Optimistic update
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
    try {
      const res = await fetch('/api/ventures/' + slug + '/products?id=' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error()
      const j = await res.json()
      setSections(prev => prev.map(s => s.id === id ? { ...s, ...j.product } : s))
    } catch {
      toast.error('Failed to update')
      // Revert
      refresh()
    }
  }

  const moveSection = (idx: number, dir: 'up' | 'down') => {
    const newIdx = dir === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= sections.length) return
    const arr = [...sections]
    const temp = arr[idx]
    arr[idx] = arr[newIdx]
    arr[newIdx] = temp
    setSections(arr)
    arr.forEach((s, i) => { updateSection(s.id, { position: i }) })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-white/[0.03] rounded w-40 animate-pulse" />
        <div className="h-[500px] bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-white">Products</h2>
          <p className="text-[13px] text-white/50 mt-0.5">Showcase what {venture.name} builds</p>
        </div>
        {isOwner && sections.length > 0 && (
          <button
            onClick={() => addSection()}
            disabled={creating}
            className="text-[12.5px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-50 h-9 px-4 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <Plus size={13} weight="bold" /> {creating ? 'Adding...' : 'Add Section'}
          </button>
        )}
      </div>

      {sections.length === 0 && !isOwner ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-20 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] items-center justify-center mb-4">
            <Package size={26} className="text-white/40" />
          </div>
          <p className="text-[15px] font-semibold text-white">No products yet</p>
          <p className="text-[12.5px] text-white/45 mt-1">The team hasn&apos;t added products yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((section, idx) => (
              <ProductSection
                key={section.id}
                section={section}
                slug={slug}
                isOwner={isOwner}
                sectionNumber={idx + 1}
                onUpdate={(patch) => updateSection(section.id, patch)}
                onDelete={() => deleteSection(section.id)}
                onMoveUp={idx > 0 ? () => moveSection(idx, 'up') : undefined}
                onMoveDown={idx < sections.length - 1 ? () => moveSection(idx, 'down') : undefined}
              />
            ))}

          {/* Add section button below last section */}
          {isOwner && sections.length > 0 && (
            <button
              onClick={() => addSection()}
              disabled={creating}
              className="w-full bg-white/[0.01] border-2 border-dashed border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.03] rounded-2xl py-6 flex items-center justify-center gap-2 text-white/50 hover:text-white transition-all disabled:opacity-50 group"
            >
              <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] group-hover:bg-white/[0.08] group-hover:border-white/[0.15] flex items-center justify-center transition-all">
                <Plus size={15} weight="bold" />
              </div>
              <span className="text-[13.5px] font-semibold">
                {creating ? 'Adding new section...' : 'Add another section'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}