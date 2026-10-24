'use client'

import Link from 'next/link'
import { Plus, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ActiveProjectsProps {
  projects: any[]
}

const colorMap: Record<string, { bg: string; text: string; ring: string; progress: string }> = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    text: 'text-white',
    ring: 'ring-blue-500/30',
    progress: 'from-blue-500 to-blue-400',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    text: 'text-white',
    ring: 'ring-purple-500/30',
    progress: 'from-purple-500 to-purple-400',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-500 to-emerald-600',
    text: 'text-white',
    ring: 'ring-green-500/30',
    progress: 'from-green-500 to-emerald-400',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-500 to-red-500',
    text: 'text-white',
    ring: 'ring-orange-500/30',
    progress: 'from-orange-500 to-orange-400',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 to-rose-500',
    text: 'text-white',
    ring: 'ring-pink-500/30',
    progress: 'from-pink-500 to-rose-400',
  },
}

const teamAvatars = ['AK', 'PS', 'DP', 'HA', 'RK', 'MA']

export function ActiveProjects({ projects }: ActiveProjectsProps) {
  const getStatus = (progress: number) => {
    if (progress < 25) return { label: 'At Risk', color: 'text-orange-500', bg: 'bg-orange-500' }
    return { label: 'On Track', color: 'text-green-500', bg: 'bg-green-500' }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="bg-card border rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
            Active Projects
          </p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} projects in flight
          </p>
        </div>
        <Link 
          href="/projects" 
          className="text-xs text-blue-500 hover:text-blue-400 font-medium"
        >
          View all →
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground mb-3">No projects yet</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 text-sm text-blue-500 hover:underline"
          >
            <Plus className="w-4 h-4" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {projects.slice(0, 4).map((project, idx) => {
            const status = getStatus(project.progress_percent)
            const color = colorMap[project.color] || colorMap.blue
            const numAvatars = 3
            const extraCount = 2

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
              >
                <Link
                  href={`/projects/${project.slug}`}
                  className="flex items-center gap-3 p-3 -mx-3 rounded-xl hover:bg-muted/40 transition-all group"
                >
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold shadow-lg ring-2',
                    color.bg,
                    color.text,
                    color.ring
                  )}>
                    {project.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{project.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {project.category?.slice(0, 2).join(' • ')}
                        </p>
                      </div>
                      <span className="text-lg font-bold tabular-nums">
                        {project.progress_percent}%
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${project.progress_percent}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                          className={cn('h-full rounded-full bg-gradient-to-r', color.progress)}
                        />
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {teamAvatars.slice(0, numAvatars).map((initials, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[8px] font-bold"
                            >
                              {initials}
                            </div>
                          ))}
                        </div>
                        {extraCount > 0 && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            +{extraCount}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className={cn('w-1.5 h-1.5 rounded-full', status.bg)} />
                        <span className={cn('text-[10px] font-medium', status.color)}>
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}

      <Link
        href="/projects/new"
        className="flex items-center justify-center gap-2 w-full py-3 border border-dashed rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 hover:border-solid transition-all group"
      >
        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
        New Project
      </Link>
    </motion.div>
  )
}