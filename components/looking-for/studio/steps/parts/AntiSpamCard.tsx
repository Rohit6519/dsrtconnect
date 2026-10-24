'use client'

import { useStudio } from '../../StudioContext'
import { InfoTooltip } from './InfoTooltip'

export function AntiSpamCard() {
  const { draft, updateField } = useStudio()
  const opp = draft.opportunity

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <label className="flex items-center text-[13px] font-bold text-white mb-1">
        Application controls <InfoTooltip text="Safeguards to prevent spam and control application volume." />
      </label>
      <p className="text-[11.5px] text-zinc-500 mb-4">
        Limits and safeguards for the application process.
      </p>
      

      <div className="space-y-3">
        <ToggleRow
          label="Applications open"
          value={opp.applications_open !== false}
          onChange={(v) => updateField({ applications_open: v })}
        />
        <ToggleRow
          label="Allow withdrawal after apply"
          value={opp.allow_withdrawal !== false}
          onChange={(v) => updateField({ allow_withdrawal: v })}
        />
        <ToggleRow
          label="Allow multiple applications from same person"
          value={!!opp.allow_multiple_applications}
          onChange={(v) => updateField({ allow_multiple_applications: v })}
        />
        <ToggleRow
          label="Auto-close after deadline"
          value={opp.auto_close_after_deadline !== false}
          onChange={(v) => updateField({ auto_close_after_deadline: v })}
        />

        <div className="pt-2">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
            Maximum applications (optional)
          </div>
          <input
            type="number"
            min={1}
            value={opp.max_applications ?? ''}
            onChange={(e) =>
              updateField({
                max_applications: e.target.value
                  ? Math.max(1, Number(e.target.value))
                  : null,
              })
            }
            placeholder="No limit"
            className="w-full md:w-40 h-10 px-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-[12.5px] text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={
          'relative w-9 h-5 rounded-full transition-colors ' +
          (value ? 'bg-white' : 'bg-zinc-800')
        }
      >
        <span
          className={
            'absolute top-0.5 w-4 h-4 rounded-full transition-all ' +
            (value ? 'left-4 bg-black' : 'left-0.5 bg-zinc-500')
          }
        />
      </button>
    </label>
  )
}