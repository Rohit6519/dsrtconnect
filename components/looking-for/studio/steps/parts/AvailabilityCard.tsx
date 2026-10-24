'use client'

import { useState, useRef, useEffect } from 'react'
import { useStudio } from '../../StudioContext'
import { InfoTooltip } from './InfoTooltip'
import { CaretDown } from '@phosphor-icons/react'

const WORK_MODES = [
  { key: 'remote', label: 'Remote' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'on-site', label: 'On-site' },
  { key: 'flexible', label: 'Flexible' },
]

const TIME_COMMITMENTS = [
  { key: '', label: 'Not specified' },
  { key: 'less-than-5', label: 'Less than 5 hrs/week' },
  { key: '5-10', label: '5–10 hrs/week' },
  { key: '10-20', label: '10–20 hrs/week' },
  { key: '20-30', label: '20–30 hrs/week' },
  { key: '30-plus', label: '30+ hrs/week' },
  { key: 'flexible', label: 'Flexible' },
]

const PROJECT_LENGTHS = [
  { key: '', label: 'Not specified' },
  { key: 'one-off', label: 'One-off task' },
  { key: 'less-than-1-month', label: 'Less than 1 month' },
  { key: '1-3-months', label: '1–3 months' },
  { key: '3-6-months', label: '3–6 months' },
  { key: '6-12-months', label: '6–12 months' },
  { key: 'long-term', label: 'Long-term' },
  { key: 'ongoing', label: 'Ongoing' },
]

const EXPERIENCE = [
  { key: 'any', label: 'Any' },
  { key: 'student', label: 'Student' },
  { key: 'entry', label: 'Entry' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'senior', label: 'Senior' },
  { key: 'expert', label: 'Expert' },
]

export function AvailabilityCard() {
  const { draft, updateField } = useStudio()
  const opp = draft.opportunity
  const needsLocation = opp.work_mode === 'hybrid' || opp.work_mode === 'on-site'

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <label className="flex items-center text-[13px] font-bold text-white mb-1">
        Work arrangement <InfoTooltip text="Define when and where the applicant will be expected to work." />
      </label>
      <p className="text-[11.5px] text-zinc-500 mb-4">Where, when and for how long.</p>

      <FieldRow label="Work mode" tooltip="Remote opens you to global applicants. Hybrid/On-site requires a specific location.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {WORK_MODES.map(m => (
            <PillBtn
              key={m.key}
              active={opp.work_mode === m.key}
              label={m.label}
              onClick={() => updateField({ work_mode: m.key })}
            />
          ))}
        </div>
      </FieldRow>

      {needsLocation && (
        <FieldRow label="Location" tooltip="Specify the exact city or office hub required.">
          <input
            type="text"
            value={opp.location || ''}
            onChange={(e) => updateField({ location: e.target.value })}
            placeholder="City, Country (e.g. Bangalore, India)"
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </FieldRow>
      )}

      <FieldRow label="Time commitment" tooltip="How many hours per week is this person expected to contribute?">
        <CustomSelect 
          options={TIME_COMMITMENTS} 
          value={opp.time_commitment || ''} 
          onChange={(v) => updateField({ time_commitment: v || null })} 
        />
      </FieldRow>

      <FieldRow label="Hours per week (optional)" tooltip="For paid contracts, specify exact billable hours if known.">
        <input
          type="number"
          min={1}
          max={80}
          value={opp.hours_per_week ?? ''}
          onChange={(e) => updateField({ hours_per_week: e.target.value ? Number(e.target.value) : null })}
          placeholder="e.g. 20"
          className="w-full md:w-40 h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </FieldRow>

      <FieldRow label="Project / role length" tooltip="Is this a quick task or a multi-year role?">
        <CustomSelect 
          options={PROJECT_LENGTHS} 
          value={opp.project_length || ''} 
          onChange={(v) => updateField({ project_length: v || null })} 
        />
      </FieldRow>

      <FieldRow label="Experience level" tooltip="Filters the types of applicants you want. Intermediate/Senior yields the best technical results on DSRT.">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {EXPERIENCE.map(e => (
            <PillBtn
              key={e.key}
              active={(opp.experience_level || 'any') === e.key}
              label={e.label}
              onClick={() => updateField({ experience_level: e.key })}
            />
          ))}
        </div>
      </FieldRow>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/70">
        <div>
          <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Start date <InfoTooltip text="When do you expect them to begin work?" />
          </div>
          <input
            type="date"
            value={opp.start_date || ''}
            onChange={(e) => updateField({ start_date: e.target.value || null })}
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div>
          <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Application deadline <InfoTooltip text="Opportunity automatically closes on this date." />
          </div>
          <input
            type="date"
            value={opp.application_deadline ? String(opp.application_deadline).slice(0, 10) : ''}
            onChange={(e) => updateField({ application_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>
    </div>
  )
}

function FieldRow({ label, tooltip, children }: { label: string; tooltip: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
        {label} <InfoTooltip text={tooltip} />
      </div>
      {children}
    </div>
  )
}

function PillBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'h-10 px-3 rounded-xl border text-[12px] font-semibold transition-colors ' +
        (active
          ? 'border-white/25 bg-white/[0.08] text-white'
          : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:text-white hover:border-zinc-600')
      }
    >
      {label}
    </button>
  )
}

function CustomSelect({ options, value, onChange }: { options: any[], value: string, onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const current = options.find(o => o.key === value)

  return (
    <div className="relative w-full max-w-sm" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-[13px] transition-colors focus:border-zinc-600 focus:outline-none"
      >
        <span className={current?.key ? 'text-zinc-200' : 'text-zinc-500'}>{current ? current.label : 'Select...'}</span>
        <CaretDown size={14} className="text-zinc-500" weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-full rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40 p-1.5 max-h-60 overflow-y-auto">
          {options.map(o => (
            <button
              key={o.key}
              type="button"
              onClick={() => { onChange(o.key); setOpen(false) }}
              className={'w-full text-left px-3 py-2.5 rounded-lg text-[13px] transition-colors ' + (value === o.key ? 'bg-zinc-900 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white')}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}