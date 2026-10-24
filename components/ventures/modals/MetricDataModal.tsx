'use client'

import { useState, useEffect } from 'react'
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
import { Plus, Trash, TrendUp, TrendDown } from '@phosphor-icons/react'
import { format } from 'date-fns'

interface MetricDataModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: any
}

export function MetricDataModal({ open, onOpenChange, metric }: MetricDataModalProps) {
  const supabase = createClient()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('venture_metric_entries')
        .select('*')
        .eq('metric_id', metric.id)
        .order('date', { ascending: false })
        .limit(50)

      setEntries(data || [])
      setLoading(false)
    }
    if (open) load()
  }, [metric.id, open])

  const addEntry = async () => {
    if (!value) {
      toast.error('Value is required')
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('venture_metric_entries')
      .upsert({
        metric_id: metric.id,
        venture_id: metric.venture_id,
        value: parseFloat(value),
        date,
        note: note.trim() || null,
      }, {
        onConflict: 'metric_id,date'
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast.error('Failed to add: ' + error.message)
    } else {
      toast.success('Data added')
      setEntries([data, ...entries.filter(e => e.date !== date)])
      setValue('')
      setNote('')
    }
  }

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this entry?')) return

    const { error } = await supabase
      .from('venture_metric_entries')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to delete')
    } else {
      setEntries(entries.filter(e => e.id !== id))
      toast.success('Deleted')
    }
  }

  const formatValue = (val: number) => {
    if (metric.type === 'currency') return `${metric.unit || '$'}${val.toLocaleString()}`
    if (metric.type === 'percentage') return `${val}%`
    return `${val.toLocaleString()}${metric.unit ? ' ' + metric.unit : ''}`
  }

  const latest = entries[0]
  const previous = entries[1]
  const change = latest && previous ? ((latest.value - previous.value) / previous.value * 100) : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{metric.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current value */}
          {latest && (
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                Latest Value
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                <p className="text-2xl font-bold tabular-nums">
                  {formatValue(latest.value)}
                </p>
                {previous && (
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {change >= 0 ? <TrendUp className="w-3 h-3" weight="bold" /> : <TrendDown className="w-3 h-3" weight="bold" />}
                    {Math.abs(change).toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(latest.date), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Add new entry */}
          <div className="space-y-3 p-4 border rounded-xl">
            <p className="text-xs font-semibold uppercase tracking-wider">Add Data Point</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="value" className="text-xs">Value *</Label>
                <Input
                  id="value"
                  type="number"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date" className="text-xs">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="note" className="text-xs">Note (optional)</Label>
              <Input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What happened this period?"
              />
            </div>

            <Button onClick={addEntry} disabled={saving || !value} size="sm" className="w-full">
              <Plus className="w-3 h-3 mr-1" weight="bold" />
              {saving ? 'Adding...' : 'Add Entry'}
            </Button>
          </div>

          {/* History */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider">History ({entries.length})</p>
            
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No data yet. Add your first entry above.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
                {entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-2 border rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatValue(entry.value)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(entry.date), 'MMM d, yyyy')}
                        {entry.note && ` · ${entry.note}`}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive p-1"
                    >
                      <Trash className="w-3 h-3" weight="bold" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}