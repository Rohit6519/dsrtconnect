// filepath: components/mail/AdvancedFilterBar.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Funnel, X, Paperclip, Star, EnvelopeOpen,
  User, Buildings, RocketLaunch, CalendarBlank, CaretDown, Check
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'

export interface MailFilters {
  hasAttachment: boolean
  isUnread: boolean
  isStarred: boolean
  fromType: 'all' | 'user' | 'project' | 'venture'
  dateRange: 'all' | 'today' | 'week' | 'month'
}

interface Props {
  filters: MailFilters
  onChange: (filters: MailFilters) => void
}

const FROM_OPTIONS = [
  { value: 'all', label: 'Anyone', icon: null },
  { value: 'user', label: 'People', icon: User },
  { value: 'project', label: 'Projects', icon: RocketLaunch },
  { value: 'venture', label: 'Ventures', icon: Buildings },
]

const DATE_OPTIONS = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Past 7 days' },
  { value: 'month', label: 'Past 30 days' },
]

export function AdvancedFilterBar({ filters, onChange }: Props) {
  const [fromOpen, setFromOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [fromPos, setFromPos] = useState({ top: 0, left: 0 })
  const [datePos, setDatePos] = useState({ top: 0, left: 0 })
  const fromBtnRef = useRef<HTMLButtonElement>(null)
  const dateBtnRef = useRef<HTMLButtonElement>(null)

  const activeCount =
    (filters.hasAttachment ? 1 : 0) +
    (filters.isUnread ? 1 : 0) +
    (filters.isStarred ? 1 : 0) +
    (filters.fromType !== 'all' ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0)

  const clearAll = () =>
    onChange({
      hasAttachment: false,
      isUnread: false,
      isStarred: false,
      fromType: 'all',
      dateRange: 'all',
    })

  const selectedFrom = FROM_OPTIONS.find((o) => o.value === filters.fromType)
  const selectedDate = DATE_OPTIONS.find((o) => o.value === filters.dateRange)

  const openFrom = () => {
    if (fromBtnRef.current) {
      const rect = fromBtnRef.current.getBoundingClientRect()
      setFromPos({ top: rect.bottom + 4, left: rect.left })
    }
    setFromOpen((v) => !v)
    setDateOpen(false)
  }

  const openDate = () => {
    if (dateBtnRef.current) {
      const rect = dateBtnRef.current.getBoundingClientRect()
      setDatePos({ top: rect.bottom + 4, left: rect.left })
    }
    setDateOpen((v) => !v)
    setFromOpen(false)
  }

  useEffect(() => {
    if (!fromOpen && !dateOpen) return
    const close = () => {
      setFromOpen(false)
      setDateOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [fromOpen, dateOpen])

  const chipBase =
    'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors border whitespace-nowrap shrink-0'
  const chipInactive =
    'bg-white/[0.03] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.06]'
  const chipActive =
    'bg-[#4F7CFF]/15 border-[#4F7CFF]/40 text-[#93c5fd]'

  const dropdownClass = cn(
    'fixed z-[9999] w-[210px] rounded-xl overflow-hidden',
    'bg-[#0F1119] border border-white/[0.1]',
    'shadow-[0_16px_48px_rgba(0,0,0,0.7)]'
  )

  return (
    <div className="relative z-20 border-b border-white/[0.06] bg-[#08090F] flex-shrink-0">
      <div className="flex items-center gap-2 px-3 h-12 overflow-x-auto scrollbar-hide">
        {/* Filter icon indicator */}
        <div
          className={cn(
            'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border shrink-0',
            activeCount > 0
              ? 'bg-[#4F7CFF]/15 border-[#4F7CFF]/30 text-[#93c5fd]'
              : 'border-white/[0.06] text-white/40'
          )}
        >
          <Funnel className="w-3.5 h-3.5" weight={activeCount > 0 ? 'duotone' : 'regular'} />
          {activeCount > 0 && <span className="text-[10.5px] font-bold">{activeCount}</span>}
        </div>

        <button
          onClick={() => onChange({ ...filters, isUnread: !filters.isUnread })}
          className={cn(chipBase, filters.isUnread ? chipActive : chipInactive)}
        >
          <EnvelopeOpen className="w-3.5 h-3.5" />
          Unread
        </button>

        <button
          onClick={() => onChange({ ...filters, hasAttachment: !filters.hasAttachment })}
          className={cn(chipBase, filters.hasAttachment ? chipActive : chipInactive)}
        >
          <Paperclip className="w-3.5 h-3.5" />
          Attachment
        </button>

        <button
          onClick={() => onChange({ ...filters, isStarred: !filters.isStarred })}
          className={cn(chipBase, filters.isStarred ? chipActive : chipInactive)}
        >
          <Star className="w-3.5 h-3.5" weight={filters.isStarred ? 'fill' : 'regular'} />
          Starred
        </button>

        <button
          ref={fromBtnRef}
          onClick={openFrom}
          className={cn(chipBase, filters.fromType !== 'all' ? chipActive : chipInactive)}
        >
          {selectedFrom?.icon && (
            <selectedFrom.icon className="w-3.5 h-3.5 text-white/70" weight="duotone" />
          )}
          From: {selectedFrom?.label}
          <CaretDown className="w-2.5 h-2.5" weight="bold" />
        </button>

        <button
          ref={dateBtnRef}
          onClick={openDate}
          className={cn(chipBase, filters.dateRange !== 'all' ? chipActive : chipInactive)}
        >
          <CalendarBlank className="w-3.5 h-3.5" />
          {selectedDate?.label}
          <CaretDown className="w-2.5 h-2.5" weight="bold" />
        </button>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] font-semibold text-white/55 hover:text-white transition-colors shrink-0"
          >
            <X className="w-3 h-3" weight="bold" />
            Clear
          </button>
        )}
      </div>

      {typeof document !== 'undefined' &&
        fromOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setFromOpen(false)} />
            <div className={dropdownClass} style={{ top: fromPos.top, left: fromPos.left }}>
              <div className="p-1">
                {FROM_OPTIONS.map((o) => {
                  const isSelected = filters.fromType === o.value
                  return (
                    <button
                      key={o.value}
                      onClick={() => {
                        onChange({ ...filters, fromType: o.value as any })
                        setFromOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors',
                        isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      )}
                    >
                      {o.icon ? (
                        <o.icon className="w-4 h-4 text-white/70" weight="duotone" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                      <span className="flex-1 text-[12.5px] font-semibold text-white">{o.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#93c5fd]" weight="bold" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}

      {typeof document !== 'undefined' &&
        dateOpen &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={() => setDateOpen(false)} />
            <div className={dropdownClass} style={{ top: datePos.top, left: datePos.left }}>
              <div className="p-1">
                {DATE_OPTIONS.map((o) => {
                  const isSelected = filters.dateRange === o.value
                  return (
                    <button
                      key={o.value}
                      onClick={() => {
                        onChange({ ...filters, dateRange: o.value as any })
                        setDateOpen(false)
                      }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors',
                        isSelected ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                      )}
                    >
                      <span className="flex-1 text-[12.5px] font-semibold text-white">{o.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#93c5fd]" weight="bold" />}
                    </button>
                  )
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}