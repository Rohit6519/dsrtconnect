'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckSquare, Square, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectTasksProps {
  projectId: string
  tasks: any[]
  members: any[]
  isMember: boolean
  currentUserId?: string
}

export function ProjectTasks({
  projectId,
  tasks,
  isMember,
  currentUserId,
}: ProjectTasksProps) {
  const router = useRouter()
  const supabase = createClient()

  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState('medium')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !currentUserId) return
    setCreating(true)

    await supabase.from('project_tasks').insert({
      project_id: projectId,
      title: title.trim(),
      priority,
      status: 'todo',
      created_by: currentUserId,
    })

    setTitle('')
    setPriority('medium')
    setShowForm(false)
    setCreating(false)
    router.refresh()
  }

  const toggleStatus = async (task: any) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await supabase
      .from('project_tasks')
      .update({
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id)
    router.refresh()
  }

  const todoTasks = tasks.filter((t) => t.status !== 'done')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Tasks</h2>
        {isMember && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Task
          </Button>
        )}
      </div>

      {showForm && (
        <div className="space-y-3 p-4 rounded-xl border border-border/40 bg-background/40">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
            }}
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Priority:</span>
            {['low', 'medium', 'high'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  'px-2.5 py-1 text-xs rounded-full capitalize',
                  priority === p
                    ? p === 'high'
                      ? 'bg-rose-500/10 text-rose-500'
                      : p === 'medium'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'bg-blue-500/10 text-blue-500'
                    : 'bg-muted/40 text-muted-foreground'
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false)
                setTitle('')
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!title.trim() || creating}
            >
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          No tasks yet. {isMember && 'Add the first task to organize work.'}
        </p>
      ) : (
        <div className="space-y-1">
          {todoTasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => isMember && toggleStatus(task)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors text-left"
              disabled={!isMember}
            >
              <Square className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm flex-1">{task.title}</span>
              <span
                className={cn(
                  'px-2 py-0.5 text-[10px] rounded-full capitalize',
                  task.priority === 'high'
                    ? 'bg-rose-500/10 text-rose-500'
                    : task.priority === 'medium'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-blue-500/10 text-blue-500'
                )}
              >
                {task.priority}
              </span>
            </button>
          ))}

          {doneTasks.length > 0 && (
            <div className="pt-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
                Completed ({doneTasks.length})
              </p>
              {doneTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => isMember && toggleStatus(task)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/40 transition-colors text-left"
                  disabled={!isMember}
                >
                  <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm flex-1 line-through text-muted-foreground">
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}