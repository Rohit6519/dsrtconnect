'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskColumnProps {
  id: string
  title: string
  color: string
  tasks: any[]
  onAdd: () => void
  children: React.ReactNode
}

export function TaskColumn({ id, title, color, tasks, onAdd, children }: TaskColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-muted/20 border rounded-xl p-3 min-h-[500px] transition-colors',
        isOver && 'bg-muted/40 border-primary/50'
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] uppercase tracking-wider font-bold', color)}>
            {title}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded-full font-bold text-muted-foreground">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAdd}
          className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {children}
        {tasks.length === 0 && (
          <button
            onClick={onAdd}
            className="w-full py-8 border-2 border-dashed rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            + Add task
          </button>
        )}
      </div>
    </div>
  )
}