'use client'

import { useState } from 'react'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Megaphone, Trophy, Package, Users, CurrencyDollar, ChartBar } from '@phosphor-icons/react'

const updateTypes = [
  { id: 'general', label: 'General', icon: Megaphone, color: 'blue' },
  { id: 'milestone', label: 'Milestone', icon: Trophy, color: 'yellow' },
  { id: 'product', label: 'Product', icon: Package, color: 'purple' },
  { id: 'team', label: 'Team', icon: Users, color: 'cyan' },
  { id: 'funding', label: 'Funding', icon: CurrencyDollar, color: 'green' },
  { id: 'metric', label: 'Metric', icon: ChartBar, color: 'orange' },
]

interface UpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ventureId: string
  onSaved: (update: any) => void
}

export function UpdateModal({ open, onOpenChange, ventureId, onSaved }: UpdateModalProps) {
  const supabase = createClient()
  const [type, setType] = useState('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('venture_updates')
      .insert({
        venture_id: ventureId,
        type,
        title: title.trim(),
        content: content.trim() || null,
        is_public: isPublic,
        created_by: user?.id,
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to post: ' + error.message)
    } else {
      toast.success(isPublic ? 'Update posted! Followers will be notified.' : 'Private update saved')
      onSaved(data)
      setTitle('')
      setContent('')
      setType('general')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post Update</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>Update Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {updateTypes.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={cn(
                      'p-2.5 border rounded-lg flex flex-col items-center gap-1.5 transition-all',
                      type === t.id
                        ? 'border-primary bg-primary/10'
                        : 'hover:bg-muted'
                    )}
                  >
                    <Icon className={cn('w-4 h-4', `text-${t.color}-500`)} weight="fill" />
                    <span className="text-[10px] font-medium">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'milestone' ? 'Hit 1,000 users!' :
                type === 'funding' ? 'Raised $500K seed round' :
                type === 'product' ? 'Launched new feature X' :
                'What is this update about?'
              }
              autoFocus
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Details (optional)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share the story, numbers, thanks..."
              rows={6}
              maxLength={2000}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {content.length} / 2000
            </p>
          </div>

          {/* Visibility */}
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Post publicly</p>
              <p className="text-[10px] text-muted-foreground">
                {isPublic 
                  ? 'Notify all followers, show on public feed'
                  : 'Only visible to your team'
                }
              </p>
            </div>
          </label>

          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1">
              {saving ? 'Posting...' : 'Post Update'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}