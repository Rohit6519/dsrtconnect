'use client'

import { formatDistanceToNow } from 'date-fns'
import { GitCommit, CheckCircle2, UserPlus, FolderPlus, Zap } from 'lucide-react'

const iconMap: Record<string, any> = {
  task_done: CheckCircle2,
  task_in_progress: Zap,
  task_created: FolderPlus,
  project_created: FolderPlus,
  member_joined: UserPlus,
  commit: GitCommit,
}

export function ProjectActivity({ activities }: any) {
  if (activities.length === 0) {
    return (
      <div className="bg-card border rounded-2xl p-12 text-center">
        <p className="text-sm text-muted-foreground">No activity yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Actions in this project will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border rounded-2xl p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider mb-4">Activity Timeline</h2>
      <div className="space-y-4">
        {activities.map((activity: any) => {
          const Icon = iconMap[activity.type] || CheckCircle2
          return (
            <div key={activity.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{activity.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.actor?.full_name && <>by {activity.actor.full_name} · </>}
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
