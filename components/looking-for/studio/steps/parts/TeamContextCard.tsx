'use client'

import { useStudio } from '../../StudioContext'
import { InfoTooltip } from './InfoTooltip'

export function TeamContextCard() {
  const { draft, updateField } = useStudio()
  const opp = draft.opportunity

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <label className="flex items-center text-[13px] font-bold text-white mb-1">
        Positions & team <InfoTooltip text="How many hires are you making, and what is the working culture like?" />
      </label>
      <p className="text-[11.5px] text-zinc-500 mb-4">
        How many people, and who will they work with.
      </p>

      <div className="mb-5">
        <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Positions open <InfoTooltip text="Opportunity automatically closes when this number of applicants are selected." />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateField({
                positions_open: Math.max(1, (opp.positions_open || 1) - 1),
              })
            }
            className="w-10 h-10 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-300 hover:text-white flex items-center justify-center text-lg"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            value={opp.positions_open || 1}
            onChange={(e) =>
              updateField({
                positions_open: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className="w-20 h-10 px-2 text-center rounded-xl bg-zinc-950 border border-zinc-800 text-[14px] font-bold text-white focus:outline-none focus:border-zinc-600"
          />
          <button
            type="button"
            onClick={() =>
              updateField({ positions_open: (opp.positions_open || 1) + 1 })
            }
            className="w-10 h-10 rounded-xl border border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-300 hover:text-white flex items-center justify-center text-lg"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          Team context (optional) <InfoTooltip text="Applicants want to know team size, culture, and reporting structure." />
        </div>
        <textarea
          value={opp.team_context || ''}
          onChange={(e) =>
            updateField({ team_context: e.target.value.slice(0, 500) })
          }
          rows={3}
          placeholder="Who will this person work with? Team size, current members, working style…"
          className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
        />
        <div className="mt-1 text-right text-[10.5px] text-zinc-600 font-mono">
          {(opp.team_context || '').length}/500
        </div>
      </div>
    </div>
  )
}