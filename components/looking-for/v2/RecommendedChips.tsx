'use client'

import { Sparkle } from '@phosphor-icons/react'

interface Props {
  onChipSelect: (skill: string) => void
}

// Sensible defaults — later this comes from user profile/signals
const DEFAULT_CHIPS = [
  'React',
  'TypeScript',
  'Python',
  'Machine Learning',
  'Product Design',
  'Node.js',
  'Data Science',
]

export function RecommendedChips({ onChipSelect }: Props) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkle size={11} weight="fill" className="text-zinc-500" />
        <h3 className="text-[12.5px] font-bold text-white">Recommended for you</h3>
      </div>
      <p className="text-[11.5px] text-zinc-500 mb-3 leading-relaxed">
        Based on your skills, interests, and recent activity.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {DEFAULT_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => onChipSelect(chip)}
            className="inline-flex items-center h-6 px-2 rounded text-[11.5px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}