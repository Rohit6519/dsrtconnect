'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Star } from '@phosphor-icons/react'

const CATEGORY_TONE: Record<string, string> = {
  progress: 'border-zinc-800',
  terminal_positive: 'border-emerald-500/25',
  terminal_negative: 'border-red-500/25',
}

export function PipelineTab({ opportunityId }: { opportunityId: string }) {
  const [stages, setStages] = useState<any[]>([])
  const [apps, setApps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/pipeline`)
      if (!res.ok) throw new Error('Failed')
      const d = await res.json()
      setStages(d.stages || [])
      setApps(d.applications || [])
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => { load() }, [load])

  const moveTo = async (appId: string, stageKey: string) => {
    const prev = apps
    setBusy(appId)
    setApps(prev => prev.map(a => a.id === appId ? { ...a, pipeline_stage: stageKey, stage_updated_at: new Date().toISOString() } : a))
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/applicants/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: stageKey }),
      })
      if (!res.ok) throw new Error('Failed')
      await load()
    } catch {
      setApps(prev)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {[0,1,2,3,4,5,6,7].map(i => (
          <div key={i} className="h-64 rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4 text-[13px] text-red-300">{error}</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
      {stages.map((s: any) => {
        const list = apps.filter(a => (a.pipeline_stage || 'submitted') === s.stage_key)
        return (
          <Column
            key={s.id}
            stage={s}
            apps={list}
            onDrop={(appId) => moveTo(appId, s.stage_key)}
            busyId={busy}
          />
        )
      })}
    </div>
  )
}

function Column({
  stage, apps, onDrop, busyId,
}: {
  stage: any
  apps: any[]
  onDrop: (appId: string) => void
  busyId: string | null
}) {
  const [over, setOver] = useState(false)
  const tone = CATEGORY_TONE[stage.category] || CATEGORY_TONE.progress

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const id = e.dataTransfer.getData('text/app-id')
        if (id) onDrop(id)
      }}
      className={
        'rounded-2xl border bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden transition-colors ' +
        (over ? 'border-white/30' : tone)
      }
    >
      <div className="px-3 py-2.5 border-b border-zinc-800/70 flex items-center justify-between">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-zinc-400">{stage.name}</span>
        <span className="text-[10.5px] font-bold text-zinc-500 h-5 min-w-[20px] px-1.5 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          {apps.length}
        </span>
      </div>
      <div className="p-2 space-y-2 min-h-[120px] max-h-[70vh] overflow-y-auto">
        {apps.length === 0 ? (
          <div className="py-8 text-center text-[11px] text-zinc-600 italic">Empty</div>
        ) : (
          apps.map(a => <Card key={a.id} app={a} busy={busyId === a.id} />)
        )}
      </div>
    </div>
  )
}

function Card({ app, busy }: { app: any; busy: boolean }) {
  const u = app.applicant || {}
  const name = u.full_name || u.username || 'Applicant'
  return (
    <div
      draggable={!busy}
      onDragStart={(e) => { e.dataTransfer.setData('text/app-id', app.id); e.dataTransfer.effectAllowed = 'move' }}
      className={
        'rounded-lg border border-zinc-800 bg-zinc-950/60 p-2.5 cursor-grab active:cursor-grabbing hover:border-zinc-600 transition-colors ' +
        (busy ? 'opacity-60 pointer-events-none' : '')
      }
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center text-[10px] font-bold text-zinc-500">
          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : name.charAt(0).toUpperCase()}
        </div>
        <span className="text-[12px] font-semibold text-white truncate flex-1">{name}</span>
        {u.is_verified && <span className="w-3 h-3 rounded-full bg-blue-500/15 border border-blue-500/25 text-[7px] font-extrabold text-blue-300 flex items-center justify-center">✓</span>}
        {app.is_starred && <Star size={9} weight="fill" className="text-amber-400" />}
      </div>
      {app.internal_rating > 0 && (
        <div className="text-[10px] text-amber-300 mb-1">
          {'★'.repeat(app.internal_rating)}<span className="text-zinc-700">{'★'.repeat(5 - app.internal_rating)}</span>
        </div>
      )}
      <div className="text-[10.5px] text-zinc-600">
        {timeAgo(app.stage_updated_at || app.created_at)}
      </div>
    </div>
  )
}

function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}