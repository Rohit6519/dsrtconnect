'use client'

import { cn } from '@/lib/utils'
import { Users, Radio, Star, Lock, Globe, Building } from 'lucide-react'
import Link from 'next/link'

interface ProjectHeaderProps {
  project: any
  onlineCount: number
  totalMembers: number
  currentUserRole: any
}

const colorMap: Record<string, string> = {
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  green: 'from-green-500 to-emerald-600',
  orange: 'from-orange-500 to-red-500',
  pink: 'from-pink-500 to-rose-500',
  red: 'from-red-500 to-red-600',
  cyan: 'from-cyan-500 to-blue-500',
  yellow: 'from-yellow-500 to-orange-500',
}

const visibilityIcons: Record<string, any> = {
  private: Lock,
  team: Building,
  public: Globe,
}

export function ProjectHeader({ project, onlineCount, totalMembers, currentUserRole }: ProjectHeaderProps) {
  const VisIcon = visibilityIcons[project.visibility] || Lock

  return (
    <div className="border-b bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg text-white text-2xl font-bold',
            colorMap[project.color] || colorMap.blue
          )}>
            {project.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/projects" className="hover:text-foreground">Projects</Link>
              <span>›</span>
              <span>{project.sector}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-[10px] font-semibold uppercase tracking-wider rounded-md">
                <VisIcon className="w-3 h-3" />
                {project.visibility}
              </span>
              {project.status === 'active' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-500 text-[10px] font-semibold uppercase tracking-wider rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                {project.description}
              </p>
            )}

            {project.category && project.category.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {project.category.map((cat: string) => (
                  <span key={cat} className="text-[10px] px-2 py-0.5 bg-muted/60 rounded-md font-medium">
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg">
              <Radio className="w-3 h-3 text-green-500" />
              <span className="text-xs font-medium">
                <span className="text-green-500 font-bold">{onlineCount}</span> online
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 rounded-lg">
              <Users className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-medium">{totalMembers} members</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Sprint Progress</span>
              <span className="font-bold">{project.progress_percent}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r transition-all',
                  colorMap[project.color] || colorMap.blue
                )}
                style={{ width: `${project.progress_percent}%` }}
              />
            </div>
          </div>
          <div className="flex gap-6 text-xs">
            <div>
              <p className="text-muted-foreground">Tasks</p>
              <p className="font-bold text-sm">
                {project.completed_tasks}/{project.total_tasks}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Sprint</p>
              <p className="font-bold text-sm">{project.sprint_number || 1}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}