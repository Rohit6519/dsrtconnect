'use client'

import { useEffect, useState } from 'react'
import { Crosshair, Sparkles, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { motion } from 'framer-motion'

interface CommandCenterProps {
  project: any
}

export function CommandCenter({ project }: CommandCenterProps) {
  const [aiInsight, setAiInsight] = useState<string>('')
  const [loadingInsight, setLoadingInsight] = useState(false)

  const daysLeft = project?.sprint_end_date 
    ? Math.max(0, Math.ceil((new Date(project.sprint_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  useEffect(() => {
    if (!project) return

    const loadInsight = async () => {
      setLoadingInsight(true)
      try {
        const res = await fetch(`/api/ai/insights?projectId=${project.id}`)
        const data = await res.json()
        if (data.insights && data.insights.length > 0) {
          // Get most critical or first insight
          const critical = data.insights.find((i: any) => i.severity === 'critical')
          const warning = data.insights.find((i: any) => i.severity === 'warning')
          const primary = critical || warning || data.insights[0]
          setAiInsight(primary.description)
        } else {
          // Trigger generation
          const genRes = await fetch('/api/ai/insights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: project.id }),
          })
          const genData = await genRes.json()
          if (genData.insights && genData.insights.length > 0) {
            setAiInsight(genData.insights[0].description)
          }
        }
      } catch (err) {
        console.error('Failed to load insight:', err)
      } finally {
        setLoadingInsight(false)
      }
    }

    loadInsight()
  }, [project?.id])

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border rounded-2xl p-6 space-y-5 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-0" />
      
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Crosshair className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
              Command Center
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your mission, progress and AI insights
            </p>
          </div>
        </div>

        {project ? (
          <>
            <div className="mt-5 flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
              <span className="px-2.5 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-500/20">
                On Track
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-sm text-muted-foreground">
                {project.sprint_name || `Sprint ${project.sprint_number}`}
              </p>
              <span className="text-muted-foreground/40">·</span>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {daysLeft} Days Left
              </p>
            </div>

            <div className="mt-5">
              <div className="flex items-end justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Sprint Progress
                </p>
                <span className="text-3xl font-bold tabular-nums bg-gradient-to-r from-blue-500 to-blue-400 bg-clip-text text-transparent">
                  {project.progress_percent}%
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress_percent}%` }}
                  transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-muted/40 border rounded-xl p-3.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
                  Next Milestone
                </p>
                <p className="text-sm font-semibold leading-tight">
                  {project.next_milestone || 'Set a milestone'}
                </p>
                {project.next_milestone_date && (
                  <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    Due {formatDistanceToNow(new Date(project.next_milestone_date), { addSuffix: true })}
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 rounded-xl p-3.5 relative overflow-hidden">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <p className="text-[9px] uppercase tracking-wider text-purple-400 font-bold">
                    AI Insight
                  </p>
                </div>
                {loadingInsight ? (
                  <div className="space-y-1">
                    <div className="h-3 bg-muted/50 animate-pulse rounded" />
                    <div className="h-3 bg-muted/50 animate-pulse rounded w-3/4" />
                  </div>
                ) : (
                  <p className="text-xs leading-snug">
                    {aiInsight || 'Analyzing your project...'}
                  </p>
                )}
              </div>
            </div>

            <Link
              href={`/projects/${project.slug}`}
              className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border rounded-lg text-sm font-medium hover:bg-muted transition-all group"
            >
              View Project Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </>
        ) : (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">
              No active project yet.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
            >
              Create Your First Project
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}