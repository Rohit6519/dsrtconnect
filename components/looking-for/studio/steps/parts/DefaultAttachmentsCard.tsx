'use client'

import { useStudio } from '../../StudioContext'
import { InfoTooltip } from './InfoTooltip'

const ITEMS: { key: string; label: string; hint: string }[] = [
  {
    key: 'require_cover_letter',
    label: 'Cover letter / intro message',
    hint: 'A short written introduction from the applicant.',
  },
  {
    key: 'require_resume',
    label: 'Resume',
    hint: 'Link or file for their resume.',
  },
  {
    key: 'require_portfolio',
    label: 'Portfolio',
    hint: 'Portfolio website or case studies.',
  },
  {
    key: 'require_github',
    label: 'GitHub profile',
    hint: 'Public GitHub URL.',
  },
  {
    key: 'require_website',
    label: 'Personal website',
    hint: 'Personal site or blog.',
  },
]

export function DefaultAttachmentsCard() {
  const { draft, updateField } = useStudio()
  const opp = draft.opportunity

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
     <label className="flex items-center text-[13px] font-bold text-white mb-1">
        Default application requirements <InfoTooltip text="Standard links and files every applicant will be asked for. Keep it minimal to increase conversion." />
      </label>
      <p className="text-[11.5px] text-zinc-500 mb-4">
        Standard fields every applicant may need to provide, separate from custom
        questions.
      </p>

      <div className="space-y-2">
        {ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex items-start justify-between gap-3 p-3 rounded-xl border border-zinc-800/70 bg-zinc-950/40 cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold text-zinc-100">
                {item.label}
              </div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{item.hint}</div>
            </div>
            <button
              type="button"
              onClick={() =>
                updateField({ [item.key]: !opp[item.key] })
              }
              className={
                'relative w-9 h-5 rounded-full transition-colors shrink-0 mt-0.5 ' +
                (opp[item.key] ? 'bg-white' : 'bg-zinc-800')
              }
            >
              <span
                className={
                  'absolute top-0.5 w-4 h-4 rounded-full transition-all ' +
                  (opp[item.key]
                    ? 'left-4 bg-black'
                    : 'left-0.5 bg-zinc-500')
                }
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  )
}