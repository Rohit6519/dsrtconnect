'use client'

import { useMemo, useState } from 'react'
import { X, Clock, Sun, Coffee, Moon, CalendarBlank } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onSnooze: (until: Date) => void
  title?: string
}

function atOffset(daysFromToday: number, hours: number, minutes = 0): Date {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hours, minutes, 0, 0)
  return d
}

function nextWeekday(target: number, hour = 8): Date {
  const d = new Date()
  const day = d.getDay()
  let add = (target - day + 7) % 7
  if (add === 0) add = 7
  d.setDate(d.getDate() + add)
  d.setHours(hour, 0, 0, 0)
  return d
}

function firstOfNextMonth(hour = 8): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + 1, 1)
  d.setHours(hour, 0, 0, 0)
  return d
}

function formatSub(d: Date): string {
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `Today, ${time}`
  if (isTomorrow) return `Tomorrow, ${time}`
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`
}

export function SnoozeModal({ open, onClose, onSnooze, title = 'Snooze until' }: Props) {
  const [customDate, setCustomDate] = useState('')
  const [customTime, setCustomTime] = useState('')

  const presets = useMemo(() => {
    const now = new Date()
    const day = now.getDay()
    const items: Array<{ id: string; label: string; date: Date; icon: any }> = []

    const laterToday = new Date(now)
    laterToday.setHours(laterToday.getHours() + 4, 0, 0, 0)
    if (laterToday.toDateString() === now.toDateString() && laterToday.getHours() < 22) {
      items.push({ id: 'later_today', label: 'Later today', date: laterToday, icon: Coffee })
    }

    items.push({ id: 'tomorrow', label: 'Tomorrow', date: atOffset(1, 8), icon: Sun })

    if (day >= 0 && day <= 2) {
      items.push({ id: 'later_week', label: 'Later this week', date: nextWeekday(3, 8), icon: CalendarBlank })
    }

    if (day >= 1 && day <= 4) {
      items.push({ id: 'weekend', label: 'This weekend', date: nextWeekday(6, 8), icon: Moon })
    }

    items.push({ id: 'next_week', label: 'Next week', date: nextWeekday(1, 8), icon: CalendarBlank })
    items.push({ id: 'someday', label: 'Someday', date: firstOfNextMonth(8), icon: Clock })

    return items
  }, [open])

  if (!open) return null

  const minDate = new Date().toISOString().split('T')[0]

  const handleCustom = () => {
    if (!customDate || !customTime) return
    const d = new Date(`${customDate}T${customTime}`)
    if (isNaN(d.getTime()) || d.getTime() <= Date.now() + 60_000) return
    onSnooze(d)
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full max-w-[400px] rounded-2xl overflow-hidden',
          'bg-gradient-to-b from-[#141419] to-[#0a0a0f]',
          'border border-white/[0.1] shadow-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/60" />
            <h3 className="text-[14px] font-bold text-white tracking-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        </div>

        <div className="p-2">
          {presets.map((o) => (
            <button
              key={o.id}
              onClick={() => onSnooze(o.date)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <o.icon className="w-4 h-4 text-white/70" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-white">{o.label}</p>
                <p className="text-[10.5px] text-white/50">{formatSub(o.date)}</p>
              </div>
            </button>
          ))}

          <div className="mt-2 pt-2 border-t border-white/[0.06]">
            <p className="text-[9.5px] uppercase tracking-widest font-bold text-white/40 px-3 pb-1.5">
              Pick date & time
            </p>
            <div className="px-3 pb-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={customDate}
                  min={minDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[12px] text-white focus:outline-none focus:border-white/[0.15]"
                />
                <input
                  type="time"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[12px] text-white focus:outline-none focus:border-white/[0.15]"
                />
              </div>
              <button
                onClick={handleCustom}
                disabled={!customDate || !customTime}
                className="w-full h-9 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed text-[12.5px] font-bold transition-colors"
              >
                Snooze
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}