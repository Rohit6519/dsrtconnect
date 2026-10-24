'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { TaskColumn } from './TaskColumn'
import { TaskCard } from './TaskCard'
import { CreateTaskModal } from './CreateTaskModal'
import { Button } from '@/components/ui/button'

interface TaskBoardProps {
  project: any
  tasks: any[]
  setTasks: (tasks: any[] | ((prev: any[]) => any[])) => void
  members: any[]
  activeSprint: any
  currentUser: any
}

const COLUMNS = [
  { id: 'todo', title: 'To Do', color: 'text-muted-foreground' },
  { id: 'in_progress', title: 'In Progress', color: 'text-blue-500' },
  { id: 'review', title: 'Review', color: 'text-purple-500' },
  { id: 'done', title: 'Done', color: 'text-green-500' },
]

export function TaskBoard({ project, tasks, setTasks, members, activeSprint, currentUser }: TaskBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [prefilledStatus, setPrefilledStatus] = useState<string>('todo')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  const supabase = createClient()

  // Real-time subscription for task changes
  useEffect(() => {
    const channel = supabase
      .channel(`project-tasks:${project.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks',
          filter: `project_id=eq.${project.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as any
            setTasks((prev: any[]) => {
              if (prev.some(t => t.id === newTask.id)) return prev
              return [newTask, ...prev]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any
            setTasks((prev: any[]) => 
              prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)
            )
          } else if (payload.eventType === 'DELETE') {
            setTasks((prev: any[]) => prev.filter(t => t.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project.id])

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status)

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeTask = tasks.find(t => t.id === active.id)
    if (!activeTask) return

    let newStatus = activeTask.status
    if (COLUMNS.some(c => c.id === over.id)) {
      newStatus = over.id
    } else {
      const overTask = tasks.find(t => t.id === over.id)
      if (overTask) newStatus = overTask.status
    }

    if (newStatus === activeTask.status) return

    // Optimistic update
    const prevTasks = tasks
    setTasks((prev: any[]) => 
      prev.map(t => t.id === activeTask.id ? { ...t, status: newStatus } : t)
    )

    const { error } = await supabase
      .from('project_tasks')
      .update({ status: newStatus })
      .eq('id', activeTask.id)

    if (error) {
      setTasks(prevTasks)
      toast.error('Failed to update task')
    } else if (newStatus === 'done') {
      toast.success('Task completed', {
        description: `${activeTask.title} moved to Done`,
      })
    }
  }

  const handleTaskCreated = (newTask: any) => {
    setTasks((prev: any[]) => [newTask, ...prev])
    setShowCreateModal(false)
  }

  const openCreateModal = (status: string) => {
    setPrefilledStatus(status)
    setShowCreateModal(true)
  }

  const activeTask = tasks.find(t => t.id === activeId)

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Task Board</h2>
          {activeSprint && (
            <p className="text-xs text-muted-foreground">
              {activeSprint.name} · Ends {new Date(activeSprint.end_date).toLocaleDateString()}
            </p>
          )}
        </div>
        <Button onClick={() => openCreateModal('todo')}>
          <Plus className="w-4 h-4 mr-1" />
          New Task
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {COLUMNS.map(column => {
            const columnTasks = getTasksByStatus(column.id)
            return (
              <TaskColumn
                key={column.id}
                id={column.id}
                title={column.title}
                color={column.color}
                tasks={columnTasks}
                onAdd={() => openCreateModal(column.id)}
              >
                <SortableContext
                  items={columnTasks.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTasks.map(task => (
                    <TaskCard key={task.id} task={task} members={members} />
                  ))}
                </SortableContext>
              </TaskColumn>
            )
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} members={members} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {showCreateModal && (
        <CreateTaskModal
          project={project}
          currentUser={currentUser}
          prefilledStatus={prefilledStatus}
          activeSprint={activeSprint}
          members={members}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleTaskCreated}
        />
      )}
    </>
  )
}