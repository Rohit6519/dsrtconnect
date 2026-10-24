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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { BUSINESS_MODELS } from '@/lib/config/sectors'
import { MagnifyingGlass, Check } from '@phosphor-icons/react'

interface BusinessModelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  venture: any
  onSaved: (venture: any) => void
}

export function BusinessModelModal({ open, onOpenChange, venture, onSaved }: BusinessModelModalProps) {
  const supabase = createClient()
  const [selected, setSelected] = useState(venture.business_model || '')
  const [details, setDetails] = useState(venture.business_model_details || '')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = BUSINESS_MODELS.filter(bm =>
    bm.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!selected) {
      toast.error('Please select a business model')
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('ventures')
      .update({
        business_model: selected,
        business_model_details: details.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', venture.id)
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to save: ' + error.message)
    } else {
      toast.success('Business model updated')
      onSaved(data)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Business Model</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            How does your venture make money? Select the primary model and add details.
          </p>

          {/* Search */}
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="duotone" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business models..."
              className="pl-9"
            />
          </div>

          {/* Model Selection Grid */}
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filtered.map((bm) => (
                <button
                  key={bm.id}
                  onClick={() => setSelected(bm.id)}
                  className={cn(
                    'p-3 border rounded-lg text-left text-sm transition-all group',
                    selected === bm.id
                      ? 'border-primary bg-primary/10 text-primary font-semibold'
                      : 'hover:border-primary/50 hover:bg-muted'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{bm.label}</span>
                    {selected === bm.id && (
                      <Check className="w-4 h-4 text-primary" weight="bold" />
                    )}
                  </div>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No models found matching "{search}"</p>
              </div>
            )}
          </div>

          {/* Details */}
          {selected && (
            <div className="space-y-2 pt-4 border-t">
              <Label>Model Details (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain how it works. e.g., 'We charge $99/mo per seat, with volume discounts for teams over 20.'"
                rows={4}
                maxLength={1000}
              />
              <p className="text-[10px] text-muted-foreground text-right">
                {details.length} / 1000
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !selected} className="flex-1">
              {saving ? 'Saving...' : 'Save Business Model'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}