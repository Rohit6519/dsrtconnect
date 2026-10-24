'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateTaskModalProps {
  project: any
  currentUser: any
  prefilledStatus: string
  activeSprint: any
  members: any[]
  onClose: () => void
  onCreated: (task: any) => void
}

const priorities = [
  { id: 'low', label: 'Low', color: 'border-blue-500/50 bg-blue-500/10 text-blue-500' },
  { id: 'medium', label: 'Medium', color: 'border-orange-500/50 bg-orange-500/10 text-orange-500' },
  { id: 'high', label: 'High', color: 'border-red-500/50 bg-red-500/10 text-red-500' },
]

export function CreateTaskModal({ project, currentUser, prefilledStatus, activeSprint, members, onClose, onCreated }: CreateTaskModalProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState(currentUser.id)
  const [tags, setTags] = useState('')

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Task title is required')
      return
    }

    setLoading(true)

    const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean)

    const { data, error } = await supabase
      .from('project_tasks')
      .insert({
        project_id: project.id,
        user_id: currentUser.id,
        assignee_id: assigneeId || null,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status: prefilledStatus,
        due_date: dueDate || null,
        sprint_id: activeSprint?.id || null,
        tags: tagsArray,
      })
      .select('*, users:user_id(full_name, username, avatar_url)')
      .single()

    setLoading(false)

    if (error) {
      toast.error('Failed to create task: ' + error.message)
      return
    }

    toast.success('Task created')
    onCreated(data)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <div className="flex gap-2">
              {priorities.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    'flex-1 px-3 py-2 border rounded-lg text-sm font-medium transition-all',
                    priority === p.id ? p.color : 'hover:bg-muted'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To</Label>
              <select
                id="assignee"
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 border rounded-md bg-background text-sm"
              >
                <option value={currentUser.id}>Myself</option>
                {members
                  .filter(m => m.user_id !== currentUser.id)
                  .map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.users?.full_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="backend, urgent, design"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading || !title.trim()}>
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}