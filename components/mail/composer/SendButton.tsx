'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PaperPlaneRight, CaretDown, Clock, CalendarBlank } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface Props {
  onSend: () => void
  onSchedule?: (date: Date) => void
  disabled?: boolean
  sending?: boolean
}

function buildPreset(hours: number, minutes = 0, dayOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hours, minutes, 0, 0)
  return d
}

function nextMondayMorning() {
  const d = new Date()
  const day = d.getDay()
  const add = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  d.setDate(d.getDate() + add)
  d.setHours(9, 0, 0, 0)
  return d
}

export function SendButton({ onSend, onSchedule, disabled, sending }: Props) {
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customLocal, setCustomLocal] = useState('')
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  const presets = useMemo(() => {
    const now = new Date()
    const tonight = buildPreset(20, 0, 0)
    const tomorrowMorning = buildPreset(9, 0, 1)
    const tomorrowAfternoon = buildPreset(14, 0, 1)
    const monday = nextMondayMorning()

    const list: Array<{ id: string; label: string; sub: string; date: Date }> = []

    if (tonight.getTime() > now.getTime() + 20 * 60 * 1000) {
      list.push({
        id: 'tonight',
        label: 'Later today',
        sub: tonight.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
        date: tonight,
      })
    }
    list.push(
      {
        id: 'tm',
        label: 'Tomorrow morning',
        sub: tomorrowMorning.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        date: tomorrowMorning,
      },
      {
        id: 'ta',
        label: 'Tomorrow afternoon',
        sub: tomorrowAfternoon.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        date: tomorrowAfternoon,
      },
      {
        id: 'mon',
        label: 'Monday morning',
        sub: monday.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
        date: monday,
      }
    )
    return list
  }, [open])

  // Position dropdown above trigger, right-aligned, using viewport coords
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return
    const update = () => {
      const rect = wrapperRef.current!.getBoundingClientRect()
      const dropdownWidth = 280
      const dropdownHeightEstimate = 360
      const top = Math.max(8, rect.top - dropdownHeightEstimate - 8)
      const left = Math.min(
        Math.max(8, rect.right - dropdownWidth),
        window.innerWidth - dropdownWidth - 8
      )
      setCoords({ top, left })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, customOpen])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (
        wrapperRef.current?.contains(t) ||
        dropdownRef.current?.contains(t)
      ) return
      setOpen(false)
      setCustomOpen(false)
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setCustomOpen(false) }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  const minLocal = useMemo(() => {
    const d = new Date(Date.now() + 5 * 60 * 1000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }, [customOpen])

  const schedule = (date: Date) => {
    if (!onSchedule) return
    if (date.getTime() <= Date.now() + 60 * 1000) return
    onSchedule(date)
    setOpen(false)
    setCustomOpen(false)
  }

  return (
    <div ref={wrapperRef} className="relative flex items-stretch">
      <button
        onClick={onSend}
        disabled={disabled || sending}
        className={cn(
          'flex items-center gap-1.5 h-9 px-4 rounded-l-md font-bold text-[12.5px] transition-all',
          'bg-white text-black hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed'
        )}
      >
        {sending ? (
          <>
            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
            Sending
          </>
        ) : (
          <>
            <PaperPlaneRight className="w-3.5 h-3.5" weight="fill" />
            Send
          </>
        )}
      </button>

      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || sending || !onSchedule}
        className={cn(
          'w-8 h-9 rounded-r-md border-l border-black/10 transition-all',
          'bg-white text-black hover:bg-zinc-200 flex items-center justify-center disabled:opacity-40'
        )}
        title="Schedule send"
      >
        <CaretDown className="w-3 h-3" weight="bold" />
      </button>

      {open && mounted && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: 280 }}
          className={cn(
            'z-[10000] rounded-xl overflow-hidden p-1.5',
            'bg-gradient-to-b from-[#141419] to-[#0a0a0f]',
            'border border-white/[0.1] shadow-[0_20px_60px_rgba(0,0,0,0.7)]'
          )}
        >
          <div className="px-2 pt-1 pb-1.5">
            <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-white/40">
              Schedule send
            </p>
          </div>

          <button
            onClick={() => { onSend(); setOpen(false) }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-left"
          >
            <PaperPlaneRight className="w-3.5 h-3.5 text-white/60" weight="fill" />
            <div>
              <p className="text-[12.5px] font-semibold text-white">Send now</p>
              <p className="text-[10.5px] text-white/45">Deliver immediately</p>
            </div>
          </button>

          <div className="h-px bg-white/[0.06] my-1" />

          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => schedule(p.date)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-left"
            >
              <Clock className="w-3.5 h-3.5 text-white/55" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-white">{p.label}</p>
                <p className="text-[10.5px] text-white/45 truncate">{p.sub}</p>
              </div>
            </button>
          ))}

          <div className="h-px bg-white/[0.06] my-1" />

          {!customOpen ? (
            <button
              onClick={() => { setCustomOpen(true); setCustomLocal(minLocal) }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-left"
            >
              <CalendarBlank className="w-3.5 h-3.5 text-white/55" />
              <div>
                <p className="text-[12.5px] font-semibold text-white">Pick date & time</p>
                <p className="text-[10.5px] text-white/45">Choose exact schedule</p>
              </div>
            </button>
          ) : (
            <div className="p-2 space-y-2">
              <input
                type="datetime-local"
                value={customLocal}
                min={minLocal}
                onChange={(e) => setCustomLocal(e.target.value)}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.1] px-2 text-[12.5px] text-white focus:outline-none focus:border-white/25"
              />
              <button
                onClick={() => {
                  if (!customLocal) return
                  const d = new Date(customLocal)
                  if (Number.isNaN(d.getTime())) return
                  schedule(d)
                }}
                className="w-full h-9 rounded-md bg-white text-black text-[12.5px] font-bold hover:bg-zinc-200"
              >
                Schedule send
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}