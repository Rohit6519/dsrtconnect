'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { format, formatDistanceToNow } from 'date-fns'

interface TaskCardProps {
  task: any
  members: any[]
  isDragging?: boolean
}

const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-500', label: 'High' },
  medium: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-500', label: 'Med' },
  low: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-500', label: 'Low' },
}

export function TaskCard({ task, members, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: dnditDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priority = priorityConfig[task.priority] || priorityConfig.medium
  const assignee = task.users || members.find(m => m.user_id === task.assignee_id)?.users

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/30 transition-all space-y-2',
        (isDragging || dnditDragging) && 'opacity-50 shadow-2xl scale-105 rotate-1'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug flex-1">{task.title}</p>
        <span className={cn('text-[9px] px-1.5 py-0.5 rounded border font-bold flex-shrink-0', priority.bg, priority.text)}>
          {priority.label}
        </span>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {task.description}
        </p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((tag: string) => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-muted rounded font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          {task.due_date && (
            <span className={cn('flex items-center gap-1', isOverdue && 'text-red-500 font-semibold')}>
              <Clock className="w-2.5 h-2.5" />
              {format(new Date(task.due_date), 'MMM d')}
            </span>
          )}
        </div>

        {assignee && (
          <Avatar className="w-5 h-5">
            <AvatarImage src={assignee.avatar_url} />
            <AvatarFallback className="text-[9px]">
              {assignee.full_name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}