'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Target } from 'lucide-react'
import { format } from 'date-fns'

export function ProjectSidebar({ project, onlineUsers, members, activeSprint }: any) {
  const onlineIds = new Set(onlineUsers.map((u: any) => u.user_id))
  const onlineMembers = members.filter((m: any) => onlineIds.has(m.user_id))

  return (
    <aside className="hidden lg:block w-72 flex-shrink-0 space-y-4">
      {activeSprint && (
        <div className="bg-card border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-[10px] uppercase tracking-wider font-bold">Current Sprint</p>
          </div>
          <p className="font-semibold text-sm">{activeSprint.name}</p>
          {activeSprint.goal && (
            <p className="text-xs text-muted-foreground mt-1">{activeSprint.goal}</p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
            <Calendar className="w-3 h-3" />
            {format(new Date(activeSprint.start_date), 'MMM d')} — {format(new Date(activeSprint.end_date), 'MMM d')}
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <p className="text-[10px] uppercase tracking-wider font-bold">
            Online Now ({onlineMembers.length})
          </p>
        </div>
        {onlineMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No one else online</p>
        ) : (
          <div className="space-y-2">
            {onlineMembers.map((member: any) => (
              <div key={member.user_id} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={member.users?.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {member.users?.full_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-green-500 rounded-full border border-background" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{member.users?.full_name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
          Project Info
        </p>
        <div className="text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sector</span>
            <span className="font-medium">{project.sector}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Visibility</span>
            <span className="font-medium capitalize">{project.visibility}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{format(new Date(project.created_at), 'MMM d, yyyy')}</span>
          </div>
        </div>
      </div>
    </aside>
  )
}