'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, ChartLineUp } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { GrowthMetricSection } from './GrowthMetricSection'
import { AddMetricModal } from './AddMetricModal'

interface Props {
  venture: any
  metrics: any[]
  slug: string
  isOwner: boolean
}

export function VentureGrowth({ venture, metrics: initialMetrics, slug, isOwner }: Props) {
  const [metrics, setMetrics] = useState<any[]>(initialMetrics || [])
  const [addOpen, setAddOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/ventures/' + slug + '/growth')
      const j = await res.json()
      setMetrics(j.metrics || [])
    } catch {}
  }, [slug])

  useEffect(() => {
    if (initialMetrics.length === 0) {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }
  }, [])

  const deleteMetric = async (id: string) => {
    if (!confirm('Remove this metric and all its data points?')) return
    try {
      await fetch('/api/ventures/' + slug + '/growth?metricId=' + id, { method: 'DELETE' })
      setMetrics(prev => prev.filter(m => m.id !== id))
      toast.success('Metric removed')
    } catch { toast.error('Failed to remove') }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-[20px] font-bold text-white">Growth & Traction</h2>
          <p className="text-[13px] text-white/50 mt-0.5">Track and present your key performance metrics</p>
        </div>
        {isOwner && (
          <button
            onClick={() => setAddOpen(true)}
            className="text-[12.5px] font-semibold text-black bg-white hover:bg-white/90 h-9 px-4 rounded-lg flex items-center gap-1.5"
          >
            <Plus size={13} weight="bold" /> Add Metric
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2].map(i => <div key={i} className="h-[400px] bg-white/[0.02] border border-white/[0.06] rounded-2xl animate-pulse" />)}
        </div>
      ) : metrics.length === 0 ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl py-20 text-center">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] items-center justify-center mb-4">
            <ChartLineUp size={26} className="text-white/40" />
          </div>
          <p className="text-[15px] font-semibold text-white">No metrics tracked yet</p>
          <p className="text-[12.5px] text-white/45 mt-1 max-w-md mx-auto">
            {isOwner ? 'Add metrics like MRR, active users, or growth rate to showcase your traction to investors and partners.' : 'The team hasn\u2019t shared metrics yet.'}
          </p>
          {isOwner && (
            <button
              onClick={() => setAddOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold bg-white text-black hover:bg-white/90 px-4 h-9 rounded-lg"
            >
              <Plus size={12} weight="bold" /> Add first metric
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {metrics
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(metric => (
              <GrowthMetricSection
                key={metric.id}
                metric={metric}
                slug={slug}
                isOwner={isOwner}
                onDelete={() => deleteMetric(metric.id)}
                onRefresh={refresh}
              />
            ))}

          {isOwner && (
            <button
              onClick={() => setAddOpen(true)}
              className="w-full bg-white/[0.01] border-2 border-dashed border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.03] rounded-2xl py-6 flex items-center justify-center gap-2 text-white/50 hover:text-white transition-all group"
            >
              <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.08] group-hover:bg-white/[0.08] flex items-center justify-center transition-all">
                <Plus size={15} weight="bold" />
              </div>
              <span className="text-[13.5px] font-semibold">Add another metric</span>
            </button>
          )}
        </div>
      )}

      {addOpen && (
        <AddMetricModal
          slug={slug}
          venture={venture}
          onClose={() => setAddOpen(false)}
          onAdded={(metric) => {
            setMetrics(prev => [...prev, metric])
            setAddOpen(false)
          }}
        />
      )}
    </div>
  )
}