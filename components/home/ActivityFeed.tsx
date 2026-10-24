'use client'

import { formatDistanceToNow } from 'date-fns'
import { GitCommit, Upload, Eye, UserPlus, RefreshCw, CheckCircle2, Activity } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ActivityFeedProps {
  activities: any[]
}

const iconMap: Record<string, any> = {
  commit: GitCommit,
  upload: Upload,
  view: Eye,
  join: UserPlus,
  sync: RefreshCw,
  task_completed: CheckCircle2,
}

const colorMap: Record<string, { bg: string; text: string }> = {
  commit: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  upload: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
  view: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  join: { bg: 'bg-orange-500/10', text: 'text-orange-400' },
  sync: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
  task_completed: { bg: 'bg-green-500/10', text: 'text-green-400' },
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="bg-card border rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-500" strokeWidth={2.5} />
          </div>
          <p className="text-[10px] uppercase tracking-[0.15em] font-bold">Activity</p>
        </div>
        <Link href="/activity" className="text-xs text-blue-500 hover:text-blue-400 font-medium">
          View all →
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start building to see updates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.slice(0, 6).map((activity, idx) => {
            const Icon = iconMap[activity.type] || CheckCircle2
            const colors = colorMap[activity.type] || colorMap.commit
            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="flex items-start gap-3 group"
              >
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110',
                  colors.bg
                )}>
                  <Icon className={cn('w-3.5 h-3.5', colors.text)} strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug">{activity.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}