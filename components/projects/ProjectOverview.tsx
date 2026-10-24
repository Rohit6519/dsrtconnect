'use client'

import { Target, Users, Activity, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AIInsights } from '@/components/home/AIInsights'

export function ProjectOverview({ project, tasks, members, activeSprint, activities, repos }: any) {
  const todoCount = tasks.filter((t: any) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t: any) => t.status === 'in_progress').length
  const doneCount = tasks.filter((t: any) => t.status === 'done').length

  const highPriorityTasks = tasks.filter((t: any) => t.priority === 'high' && t.status !== 'done').slice(0, 5)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="To Do" value={todoCount} color="text-muted-foreground" />
        <StatCard label="In Progress" value={inProgressCount} color="text-blue-500" />
        <StatCard label="Done" value={doneCount} color="text-green-500" />
        <StatCard label="Team" value={members.length} color="text-purple-500" />
      </div>

      {/* AI Insights - Full Width */}
      <AIInsights projectId={project.id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {project.goals && (
          <div className="bg-card border rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm">Project Goals</h3>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.goals}</p>
          </div>
        )}

        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">Recent Activity</h3>
          </div>
          {activities.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {activities.map((a: any) => (
                <div key={a.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs">{a.message}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {highPriorityTasks.length > 0 && (
        <div className="bg-card border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-sm">High Priority Tasks</h3>
          </div>
          <div className="space-y-2">
            {highPriorityTasks.map((task: any) => (
              <div key={task.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/40 transition-colors">
                <p className="text-sm">{task.title}</p>
                <span className="text-[10px] px-2 py-0.5 bg-red-500/10 text-red-500 rounded-md font-bold">
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="bg-card border rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
    </div>
  )
}