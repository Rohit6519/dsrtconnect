'use client'

import { useEffect, useState } from 'react'
import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, Zap, X, RefreshCw, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

const severityConfig: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  info: { icon: Lightbulb, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  success: { icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
}

const typeIcons: Record<string, any> = {
  risk: AlertTriangle,
  opportunity: TrendingUp,
  insight: Lightbulb,
  action: Zap,
  prediction: Sparkles,
}

interface AIInsightsProps {
  projectId?: string
}

export function AIInsights({ projectId }: AIInsightsProps) {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const url = projectId 
        ? `/api/ai/insights?projectId=${projectId}`
        : '/api/ai/insights'
      const res = await fetch(url)
      const data = await res.json()
      if (data.insights) setInsights(data.insights)
    } catch (err) {
      console.error('Failed to load insights:', err)
    } finally {
      setLoading(false)
    }
  }

  const generate = async (force = false) => {
    if (!projectId) return
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, force }),
      })
      const data = await res.json()
      
      if (data.insights) {
        setInsights(data.insights)
        if (!data.cached) {
          toast.success(`Generated ${data.insights.length} new insights`)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate insights')
    } finally {
      setGenerating(false)
    }
  }

  const dismiss = async (id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id))
    
    await fetch('/api/ai/insights', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insightId: id, action: 'dismiss' }),
    })
  }

  useEffect(() => {
    load()
    // Auto-generate insights for project when opened
    if (projectId && insights.length === 0) {
      generate(false)
    }
  }, [projectId])

  if (loading) {
    return (
      <div className="bg-card border rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold">AI Insights</p>
        </div>
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-2xl overflow-hidden"
    >
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] font-bold">AI Insights</p>
            <p className="text-[10px] text-muted-foreground">
              {insights.length > 0 ? `${insights.length} active` : 'Analyzing your work'}
            </p>
          </div>
        </div>
        {projectId && (
          <button
            onClick={() => generate(true)}
            disabled={generating}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-3 h-3', generating && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="p-8 text-center">
          <Sparkles className="w-10 h-10 mx-auto text-purple-500/30 mb-3" />
          {projectId ? (
            <>
              <p className="text-sm text-muted-foreground">
                {generating ? 'Analyzing project...' : 'No insights yet'}
              </p>
              {!generating && (
                <button
                  onClick={() => generate(true)}
                  className="text-xs text-blue-500 hover:underline mt-2"
                >
                  Generate insights →
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                No insights yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Insights appear when you have active projects
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="divide-y">
          <AnimatePresence>
            {insights.slice(0, 5).map((insight, idx) => {
              const config = severityConfig[insight.severity] || severityConfig.info
              const TypeIcon = typeIcons[insight.type] || Lightbulb
              const Icon = config.icon
              
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10, height: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    'p-4 border-l-2 transition-colors hover:bg-muted/30',
                    config.border
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      config.bg
                    )}>
                      <Icon className={cn('w-4 h-4', config.color)} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold leading-snug">
                          {insight.title}
                        </p>
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                          config.bg,
                          config.color
                        )}>
                          {insight.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {insight.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {insight.action_label && (
                          <button className="text-xs text-blue-500 hover:underline font-medium flex items-center gap-0.5">
                            {insight.action_label}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {insight.confidence}% confidence
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => dismiss(insight.id)}
                      className="text-muted-foreground/50 hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}