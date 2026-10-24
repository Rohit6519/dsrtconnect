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

interface EditTextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture: any
  field: string
  label: string
  value: string
  multiline?: boolean
  maxLength?: number
  onSaved: (venture: any) => void
}

export function EditTextModal({
  open,
  onOpenChange,
  venture,
  field,
  label,
  value: initialValue,
  multiline = true,
  maxLength = 2000,
  onSaved,
}: EditTextModalProps) {
  const supabase = createClient()
  const [value, setValue] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)

    const { data, error } = await supabase
      .from('ventures')
      .update({ 
        [field]: value.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', venture.id)
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Saved')
      onSaved(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {multiline ? (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}...`}
              rows={8}
              maxLength={maxLength}
              autoFocus
              className="resize-none text-sm leading-relaxed"
            />
          ) : (
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Enter ${label.toLowerCase()}...`}
              maxLength={maxLength}
              autoFocus
            />
          )}

          <p className={`text-[10px] text-right ${value.length > maxLength - 100 ? 'text-orange-500 font-semibold' : 'text-muted-foreground'}`}>
            {value.length} / {maxLength}
          </p>

          <div className="flex gap-2 pt-3 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1"
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}