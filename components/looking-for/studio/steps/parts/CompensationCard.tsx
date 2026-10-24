'use client'

import { useState, useRef, useEffect } from 'react'
import { useStudio } from '../../StudioContext'
import { InfoTooltip } from './InfoTooltip'
import { CaretDown } from '@phosphor-icons/react'

const CURRENCIES = [
  { key: 'USD', label: 'USD ($)' },
  { key: 'EUR', label: 'EUR (€)' },
  { key: 'GBP', label: 'GBP (£)' },
  { key: 'INR', label: 'INR (₹)' },
  { key: 'CAD', label: 'CAD ($)' },
  { key: 'AUD', label: 'AUD ($)' },
  { key: 'SGD', label: 'SGD ($)' },
]

export function CompensationCard() {
  const { draft, updateField } = useStudio()
  const opp = draft.opportunity

  const type = opp.compensation_type || 'unpaid'
  const oppType = opp.opportunity_type

  const isEquityMode = oppType === 'cofounder' || type === 'equity' || type === 'equity-plus-cash'
  const isPaidMode = ['hourly', 'fixed-price', 'monthly', 'annual', 'equity-plus-cash'].includes(type)

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <label className="flex items-center text-[13px] font-bold text-white mb-4">
        Compensation <InfoTooltip text="Opportunities with clear compensation receive 3x more applications." />
      </label>

      {/* Type selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <TypeBtn active={type === 'unpaid'} label="Unpaid" onClick={() => updateField({ compensation_type: 'unpaid', compensation_min: null, compensation_max: null, equity_min: null, equity_max: null })} />
        <TypeBtn active={type === 'collaboration'} label="Collaboration" onClick={() => updateField({ compensation_type: 'collaboration', compensation_min: null, compensation_max: null, equity_min: null, equity_max: null })} />
        <TypeBtn active={type === 'hourly'} label="Hourly" onClick={() => updateField({ compensation_type: 'hourly', compensation_period: 'hour' })} />
        <TypeBtn active={type === 'fixed-price'} label="Fixed price" onClick={() => updateField({ compensation_type: 'fixed-price', compensation_period: null })} />
        <TypeBtn active={type === 'monthly'} label="Monthly" onClick={() => updateField({ compensation_type: 'monthly', compensation_period: 'month' })} />
        <TypeBtn active={type === 'annual'} label="Annual" onClick={() => updateField({ compensation_type: 'annual', compensation_period: 'year' })} />
        <TypeBtn active={type === 'equity'} label="Equity only" onClick={() => updateField({ compensation_type: 'equity', compensation_min: null, compensation_max: null })} />
        <TypeBtn active={type === 'equity-plus-cash'} label="Equity + Cash" onClick={() => updateField({ compensation_type: 'equity-plus-cash' })} />
      </div>

      {/* Paid range */}
      {isPaidMode && (
        <div className="mb-6">
          <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Amount Budget <InfoTooltip text="Leave max blank if it's a fixed flat rate." />
          </div>
          <div className="grid grid-cols-[110px_1fr_auto_1fr] items-center gap-2 max-w-lg">
            <CurrencyDropdown value={opp.compensation_currency || 'USD'} onChange={(v) => updateField({ compensation_currency: v })} />
            <input
              type="number"
              min={0}
              value={opp.compensation_min ?? ''}
              onChange={(e) => updateField({ compensation_min: e.target.value ? Number(e.target.value) : null })}
              placeholder="Min"
              className="h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <span className="text-zinc-600 text-sm px-1">—</span>
            <input
              type="number"
              min={0}
              value={opp.compensation_max ?? ''}
              onChange={(e) => updateField({ compensation_max: e.target.value ? Number(e.target.value) : null })}
              placeholder="Max"
              className="h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      )}

      {/* Equity range */}
      {isEquityMode && (
        <div className="mb-6">
          <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Equity (%) <InfoTooltip text="Vesting and cliff details should be explained in your description." />
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 max-w-sm">
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={opp.equity_min ?? ''}
              onChange={(e) => updateField({ equity_min: e.target.value ? Number(e.target.value) : null })}
              placeholder="Min %"
              className="h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <span className="text-zinc-600 text-sm px-1">—</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={opp.equity_max ?? ''}
              onChange={(e) => updateField({ equity_max: e.target.value ? Number(e.target.value) : null })}
              placeholder="Max %"
              className="h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="space-y-3 pt-5 border-t border-zinc-800/70">
        <ToggleRow
          label="Compensation is negotiable"
          tooltip="Check this if the final amount heavily depends on applicant experience."
          value={!!opp.compensation_negotiable}
          onChange={(v) => updateField({ compensation_negotiable: v })}
        />
        <ToggleRow
          label="Hide compensation from public listing"
          tooltip="Checking this means amounts are completely hidden on the public card."
          value={!!opp.compensation_hidden}
          onChange={(v) => updateField({ compensation_hidden: v })}
        />
      </div>
    </div>
  )
}

function TypeBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'h-11 px-3 rounded-xl border text-[12.5px] font-semibold transition-colors ' +
        (active
          ? 'border-white/25 bg-white/[0.08] text-white'
          : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-white hover:border-zinc-600')
      }
    >
      {label}
    </button>
  )
}

function ToggleRow({ label, tooltip, value, onChange }: { label: string; tooltip: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="flex items-center text-[12.5px] text-zinc-300">
        {label} <InfoTooltip text={tooltip} />
      </span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={'relative w-10 h-6 rounded-full transition-colors ' + (value ? 'bg-white' : 'bg-zinc-800')}
      >
        <span className={'absolute top-0.5 w-5 h-5 rounded-full transition-all ' + (value ? 'left-4 bg-black' : 'left-0.5 bg-zinc-500')} />
      </button>
    </label>
  )
}

function CurrencyDropdown({ value, onChange }: { value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const current = CURRENCIES.find(o => o.key === value)

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-11 px-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-200 transition-colors focus:border-zinc-600 focus:outline-none"
      >
        <span>{current ? current.key : 'USD'}</span>
        <CaretDown size={14} className="text-zinc-500" weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-32 rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40 p-1 max-h-60 overflow-y-auto">
          {CURRENCIES.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => { onChange(c.key); setOpen(false) }}
              className={'w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors ' + (value === c.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}