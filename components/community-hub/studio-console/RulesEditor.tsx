'use client'

import { useEffect, useState } from 'react'
import { Loader2, Plus, Save, ScrollText, Trash2, GripVertical } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { DsrtSection, DsrtButton, DsrtEmpty, DsrtPanel, DsrtSkeleton } from '@/components/dsrt'

interface Props { slug: string }

export function RulesEditor({ slug }: Props) {
  const [rules, setRules] = useState<Array<{ title: string; description?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/v1/community/${slug}/studio/rules`)
      .then((r) => r.json())
      .then((j) => setRules((j?.data?.items || []).map((r: any) => ({ title: r.title, description: r.description || '' }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const add = () => setRules((prev) => [...prev, { title: '', description: '' }])
  const remove = (i: number) => setRules((prev) => prev.filter((_, idx) => idx !== i))
  const move = (i: number, dir: -1 | 1) => {
    const next = i + dir
    if (next < 0 || next >= rules.length) return
    setRules((prev) => {
      const copy = [...prev];
      [copy[i], copy[next]] = [copy[next], copy[i]];
      return copy
    })
  }
  const setRule = (i: number, patch: Partial<{ title: string; description: string }>) => {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  const save = async () => {
    const cleaned = rules.filter((r) => r.title.trim())
    if (cleaned.length === 0) { toast.error('Add at least one rule'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/community/${slug}/studio/rules`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rules: cleaned }),
      })
      if (!res.ok) { toast.error('Save failed'); return }
      toast.success('Rules saved')
    } finally { setSaving(false) }
  }

  if (loading) return <DsrtSkeleton className="h-96 w-full rounded-2xl" />

  return (
    <div className="space-y-4">
      <DsrtSection
        title="Community Rules"
        description="Displayed publicly. Used as guidelines during moderation."
        headerVariant="large"
        actions={
          <div className="flex items-center gap-2">
            <DsrtButton variant="outline" size="sm" onClick={add}>
              <Plus size={14} /> Add Rule
            </DsrtButton>
            <DsrtButton variant="primary" size="sm" onClick={save} loading={saving}>
              <Save size={14} /> Save
            </DsrtButton>
          </div>
        }
      />

      {rules.length === 0 ? (
        <DsrtPanel>
          <DsrtEmpty icon={ScrollText} title="No rules defined" description="Set expectations for your community members." />
        </DsrtPanel>
      ) : (
        <div className="space-y-3">
          {rules.map((r, i) => (
            <DsrtPanel key={i} padding="md" className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-2 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-white/30 hover:text-white disabled:opacity-20 transition-colors">
                  <GripVertical className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono font-bold text-white/50 bg-white/[0.04] px-1.5 rounded">{i + 1}</span>
                <button onClick={() => move(i, 1)} disabled={i === rules.length - 1} className="text-white/30 hover:text-white disabled:opacity-20 transition-colors">
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <input
                  value={r.title} onChange={(e) => setRule(i, { title: e.target.value })}
                  placeholder="Rule title (e.g. Be respectful)"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[14px] font-semibold text-white focus:outline-none focus:border-white/[0.2]"
                />
                <textarea
                  value={r.description || ''} onChange={(e) => setRule(i, { description: e.target.value })}
                  rows={2} placeholder="Optional detailed explanation..."
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 focus:outline-none focus:border-white/[0.2] resize-none"
                />
              </div>
              <button onClick={() => remove(i)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 flex items-center justify-center shrink-0 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </DsrtPanel>
          ))}
        </div>
      )}
    </div>
  )
}