// ============================================================
// components/settings/CocoMemorySettings.tsx
// ============================================================
'use client'

import { useEffect, useState } from 'react'
import { Trash, Edit2, Check, X, BrainCircuit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner' // Assuming you use sonner for standard toasts

interface Memory {
  id: string
  key: string
  value: string
  type: string
  source: string
  updated_at: string
}

export function CocoMemorySettings() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    fetchMemories()
  }, [])

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/coco/memory')
      const json = await res.json()
      if (json.memories) setMemories(json.memories)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/coco/memory/${id}`, { method: 'DELETE' })
      setMemories((prev) => prev.filter((m) => m.id !== id))
      toast.success('Memory deleted')
    } catch {
      toast.error('Failed to delete memory')
    }
  }

  const handleSaveEdit = async (id: string) => {
    try {
      await fetch(`/api/coco/memory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: editValue }),
      })
      setMemories((prev) =>
        prev.map((m) => (m.id === id ? { ...m, value: editValue } : m))
      )
      setEditingId(null)
      toast.success('Memory updated')
    } catch {
      toast.error('Failed to update memory')
    }
  }

  if (loading) {
    return <div className="p-8 text-white/50 text-[13px] animate-pulse">Loading memories...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold text-white tracking-tight">COCO Memory</h2>
          <p className="text-[13px] text-white/50">Manage facts and preferences COCO remembers about you.</p>
        </div>
      </div>

      {memories.length === 0 ? (
        <div className="p-8 text-center bg-white/[0.02] border border-white/[0.04] rounded-xl">
          <p className="text-[13px] text-white/50">COCO hasn't saved any explicit memories yet.</p>
          <p className="text-[12px] text-white/30 mt-1">Tell COCO "Remember that..." in the chat.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {memories.map((m) => (
            <div key={m.id} className="p-4 bg-[#0B0F17] border border-white/[0.06] rounded-xl flex gap-4 transition-colors hover:bg-white/[0.02]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-blue-300/80 bg-blue-500/10 px-2 py-0.5 rounded">
                    {m.key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-white/30">
                    Updated {new Date(m.updated_at).toLocaleDateString()}
                  </span>
                </div>
                
                {editingId === m.id ? (
                  <div className="mt-2 flex gap-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/[0.1] rounded-lg p-2.5 text-[13px] text-white resize-none outline-none focus:border-blue-500/50"
                      rows={2}
                    />
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => handleSaveEdit(m.id)} className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-md transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] text-white/85 leading-relaxed">{m.value}</p>
                )}
              </div>

              {editingId !== m.id && (
                <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditingId(m.id); setEditValue(m.value) }}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-white/50 hover:text-white rounded-md transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-red-500/10 text-white/50 hover:text-red-400 rounded-md transition-colors"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}