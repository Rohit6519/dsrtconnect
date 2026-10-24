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
import { CurrencyDollar, Users, Handshake, Storefront, Star, Sparkle } from '@phosphor-icons/react'

const types = [
  { id: 'investment', label: 'Investment', icon: CurrencyDollar, color: 'green' },
  { id: 'talent', label: 'Talent / Hire', icon: Users, color: 'blue' },
  { id: 'partner', label: 'Partnership', icon: Handshake, color: 'purple' },
  { id: 'customer', label: 'Customer', icon: Storefront, color: 'orange' },
  { id: 'advisor', label: 'Advisor', icon: Star, color: 'yellow' },
  { id: 'other', label: 'Other', icon: Sparkle, color: 'gray' },
]

const urgencyLevels = [
  { id: 'low', label: 'Low', color: 'bg-blue-500/10 text-blue-500' },
  { id: 'normal', label: 'Normal', color: 'bg-purple-500/10 text-purple-500' },
  { id: 'high', label: 'High', color: 'bg-orange-500/10 text-orange-500' },
  { id: 'urgent', label: 'Urgent', color: 'bg-red-500/10 text-red-500' },
]

interface LookingForModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ventureId: string
  item?: any
  onSaved: (item: any, isEdit: boolean) => void
}

export function LookingForModal({ open, onOpenChange, ventureId, item, onSaved }: LookingForModalProps) {
  const supabase = createClient()
  const isEdit = !!item

  const [type, setType] = useState(item?.type || 'investment')
  const [title, setTitle] = useState(item?.title || '')
  const [description, setDescription] = useState(item?.description || '')
  const [amount, setAmount] = useState(item?.amount || '')
  const [count, setCount] = useState(item?.count?.toString() || '1')
  const [urgency, setUrgency] = useState(item?.urgency || 'normal')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    setSaving(true)

    const data = {
      venture_id: ventureId,
      type,
      title: title.trim(),
      description: description.trim() || null,
      amount: amount.trim() || null,
      count: parseInt(count) || 1,
      urgency,
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('venture_looking_for')
        .update(data)
        .eq('id', item.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('venture_looking_for')
        .insert(data)
        .select()
        .single()
    }

    setSaving(false)

    if (result.error) {
      toast.error('Failed to save: ' + result.error.message)
    } else {
      toast.success(isEdit ? 'Updated' : 'Added')
      onSaved(result.data, isEdit)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit' : 'Add'} What You're Looking For</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>What are you looking for?</Label>
            <div className="grid grid-cols-3 gap-2">
              {types.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={cn(
                      'p-3 border rounded-lg flex flex-col items-center gap-2 transition-all',
                      type === t.id
                        ? `border-primary bg-primary/10 text-primary`
                        : 'hover:bg-muted'
                    )}
                  >
                    <Icon className="w-4 h-4" weight="fill" />
                    <span className="text-xs font-medium">{t.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === 'investment' ? 'Pre-Seed Investment' :
                type === 'talent' ? 'Senior Full-Stack Engineer' :
                type === 'partner' ? 'Distribution Partner in EU' :
                'What you need'
              }
              autoFocus
            />
          </div>

          {/* Amount (for investment) */}
          {type === 'investment' && (
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$300K - $500K"
              />
            </div>
          )}

          {/* Count */}
          <div className="space-y-2">
            <Label>How many?</Label>
            <Input
              type="number"
              min="1"
              value={count}
              onChange={(e) => setCount(e.target.value)}
            />
          </div>

          {/* Urgency */}
          <div className="space-y-2">
            <Label>Urgency</Label>
            <div className="grid grid-cols-4 gap-2">
              {urgencyLevels.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setUrgency(u.id)}
                  className={cn(
                    'p-2 border rounded-lg text-xs font-medium transition-all',
                    urgency === u.id
                      ? u.color + ' border-current'
                      : 'hover:bg-muted'
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="More details about what you need..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} className="flex-1">
              {saving ? 'Saving...' : (isEdit ? 'Update' : 'Add')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}