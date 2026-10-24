'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Target, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface TodaysMissionProps {
  tasks: any[]
  userId: string
}

const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'High Priority' },
  medium: { bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400', label: 'Medium Priority' },
  low: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', label: 'Low Priority' },
}

export function TodaysMission({ tasks: initialTasks, userId }: TodaysMissionProps) {
  const router = useRouter()
  const supabase = createClient()
  const [tasks, setTasks] = useState(initialTasks)

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done'
    
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

    const { error } = await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', taskId)

    if (error) {
      setTasks(tasks)
      toast.error('Failed to update task')
    } else if (newStatus === 'done') {
      toast.success('Task completed', {
        description: 'Great work — keep the momentum going.',
      })
      setTimeout(() => router.refresh(), 800)
    }
  }

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const completedToday = tasks.filter(t => t.status === 'done').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card border rounded-2xl p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <Target className="w-4 h-4 text-red-500" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-bold">
              Today's Mission
            </p>
            <p className="text-xs text-muted-foreground">
              {completedToday} done • {activeTasks.length} remaining
            </p>
          </div>
        </div>
      </div>

      {activeTasks.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-sm font-medium">All done for today</p>
          <p className="text-xs text-muted-foreground mt-1">
            Time to celebrate or plan tomorrow.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {activeTasks.slice(0, 5).map((task) => {
              const priority = priorityConfig[task.priority] || priorityConfig.medium
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  className="flex items-center gap-3 py-2.5 group"
                >
                  <button
                    onClick={() => toggleTask(task.id, task.status)}
                    className={cn(
                      'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      'border-muted-foreground/30 hover:border-primary hover:scale-110'
                    )}
                  >
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate leading-tight">
                      {task.title}
                    </p>
                  </div>
                  
                  {task.due_time && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {task.due_time.slice(0, 5)}
                    </span>
                  )}
                  
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-md border font-semibold',
                    priority.bg,
                    priority.text
                  )}>
                    {priority.label}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <Link
        href="/tasks"
        className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground pt-3 border-t transition-colors group"
      >
        View all tasks
        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </motion.div>
  )
}