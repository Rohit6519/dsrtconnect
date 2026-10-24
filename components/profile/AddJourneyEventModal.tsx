'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const categories = [
  { id: 'education', label: 'Education', icon: '🎓' },
  { id: 'startup', label: 'Startup', icon: '🚀' },
  { id: 'project', label: 'Project', icon: '⚡' },
  { id: 'career', label: 'Career', icon: '💼' },
  { id: 'achievement', label: 'Achievement', icon: '🏆' },
  { id: 'community', label: 'Community', icon: '👥' },
  { id: 'goal', label: 'Future Goal', icon: '🎯' },
]

interface AddJourneyEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function AddJourneyEventModal({
  open,
  onOpenChange,
  userId,
}: AddJourneyEventModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState('project')
  const [status, setStatus] = useState('completed')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!title.trim() || !date) return
    setLoading(true)

    await supabase.from('journey_events').insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim() || null,
      event_date: date,
      category,
      status: category === 'goal' ? 'goal' : status,
      is_auto: false,
      is_approved: true,
    })

    setLoading(false)
    router.refresh()
    setTitle('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setCategory('project')
    setStatus('completed')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Journey Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    'p-2 rounded-lg border-2 text-center transition-all',
                    category === cat.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  )}
                >
                  <div className="text-xl">{cat.icon}</div>
                  <div className="text-[10px] mt-1">{cat.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Founded DSRT"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this milestone about?"
              rows={3}
            />
          </div>

          {category !== 'goal' && (
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {['completed', 'in_progress'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={cn(
                      'p-2 rounded-lg border-2 text-sm transition-all',
                      status === s
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    )}
                  >
                    {s === 'completed' ? '✓ Completed' : '◉ In Progress'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!title.trim() || !date || loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : 'Add Event'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}