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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { METRIC_PRESETS } from '@/lib/config/sectors'
import { ChartLineUp, ChartBar, Percent, CurrencyDollar, Users, MagnifyingGlass } from '@phosphor-icons/react'

const frequencies = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
]

const types = [
  { id: 'number', label: 'Number', icon: ChartBar },
  { id: 'currency', label: 'Currency', icon: CurrencyDollar },
  { id: 'percentage', label: 'Percentage', icon: Percent },
]

const colors = ['blue', 'green', 'purple', 'orange', 'red', 'pink', 'cyan', 'yellow']

interface MetricModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ventureId: string
  metric?: any
  onSaved: (metric: any, isEdit: boolean) => void
}

export function MetricModal({ open, onOpenChange, ventureId, metric, onSaved }: MetricModalProps) {
  const supabase = createClient()
  const isEdit = !!metric

  const [step, setStep] = useState<'preset' | 'custom'>('preset')
  const [search, setSearch] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<any>(null)

  const [name, setName] = useState(metric?.name || '')
  const [type, setType] = useState(metric?.type || 'number')
  const [unit, setUnit] = useState(metric?.unit || '')
  const [frequency, setFrequency] = useState(metric?.frequency || 'monthly')
  const [color, setColor] = useState(metric?.color || 'blue')
  const [isPublic, setIsPublic] = useState(metric?.is_public ?? true)
  const [showOnOverview, setShowOnOverview] = useState(metric?.show_on_overview ?? true)
  const [saving, setSaving] = useState(false)

  const filteredPresets = METRIC_PRESETS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const selectPreset = (preset: any) => {
    if (preset.id === 'custom') {
      setStep('custom')
      setName('')
      setUnit('')
      setType('number')
      setColor('gray')
    } else {
      setSelectedPreset(preset)
      setName(preset.name)
      setType(preset.type)
      setUnit(preset.unit)
      setColor(preset.color)
      setStep('custom')
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Metric name is required')
      return
    }

    setSaving(true)

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 6)

    const data = {
      venture_id: ventureId,
      name: name.trim(),
      slug,
      type,
      unit: unit.trim() || null,
      frequency,
      color,
      is_public: isPublic,
      show_on_overview: showOnOverview,
    }

    let result
    if (isEdit) {
      result = await supabase
        .from('venture_metrics')
        .update(data)
        .eq('id', metric.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('venture_metrics')
        .insert(data)
        .select()
        .single()
    }

    setSaving(false)

    if (result.error) {
      toast.error('Failed to save: ' + result.error.message)
    } else {
      toast.success(isEdit ? 'Metric updated' : 'Metric added')
      onSaved(result.data, isEdit)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Metric' : 'Add Key Metric'}</DialogTitle>
        </DialogHeader>

        {step === 'preset' && !isEdit ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">
                Choose from common metrics or create custom
              </p>
            </div>

            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" weight="duotone" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search metrics..."
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto pr-2">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => selectPreset(preset)}
                  className="p-3 border rounded-lg text-left hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-6 h-6 rounded flex items-center justify-center', `bg-${preset.color}-500/10`)}>
                      {preset.type === 'currency' && <CurrencyDollar className={`w-3 h-3 text-${preset.color}-500`} weight="fill" />}
                      {preset.type === 'percentage' && <Percent className={`w-3 h-3 text-${preset.color}-500`} weight="fill" />}
                      {preset.type === 'number' && <ChartBar className={`w-3 h-3 text-${preset.color}-500`} weight="fill" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{preset.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {preset.type} · {preset.unit}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {!isEdit && (
              <button
                onClick={() => setStep('preset')}
                className="text-xs text-blue-500 hover:underline flex items-center gap-1"
              >
                ← Back to presets
              </button>
            )}

            {/* Name */}
            <div className="space-y-2">
              <Label>Metric Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Monthly Revenue, Active Users"
                autoFocus
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label>Type</Label>
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
                          ? 'border-primary bg-primary/10 text-primary'
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

            {/* Unit */}
            <div className="space-y-2">
              <Label>Unit / Suffix</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder={type === 'currency' ? '$' : type === 'percentage' ? '%' : 'users, orders, etc.'}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>Update Frequency</Label>
              <div className="grid grid-cols-5 gap-1">
                {frequencies.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className={cn(
                      'p-2 border rounded-lg text-xs font-medium transition-all',
                      frequency === f.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Display Color</Label>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      `w-8 h-8 rounded-lg transition-all bg-${c}-500`,
                      color === c ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' : 'hover:scale-105'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 pt-3 border-t">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={showOnOverview}
                  onChange={(e) => setShowOnOverview(e.target.checked)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Show on Overview</p>
                  <p className="text-[10px] text-muted-foreground">Display this metric on the overview page</p>
                </div>
              </label>

              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Public</p>
                  <p className="text-[10px] text-muted-foreground">Visible to everyone (uncheck for private/internal)</p>
                </div>
              </label>
            </div>

            <div className="flex gap-2 pt-3 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
                {saving ? 'Saving...' : (isEdit ? 'Update' : 'Add Metric')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}