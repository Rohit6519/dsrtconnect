'use client'

import { useComposer } from './ComposerContext'
import {
  ChatCircle, Lightbulb, Code, Trophy, Rocket, FileText,
  MegaphoneSimple, ChartBar, ArticleNyTimes, CalendarBlank,
} from '@phosphor-icons/react'

const TYPES = [
  { id: 'update', label: 'Update', Icon: ChatCircle },
  { id: 'idea', label: 'Idea', Icon: Lightbulb },
  { id: 'build_log', label: 'Build Log', Icon: Code },
  { id: 'milestone', label: 'Milestone', Icon: Trophy },
  { id: 'launch', label: 'Launch', Icon: Rocket },
  { id: 'looking_for', label: 'Looking For', Icon: FileText },
  { id: 'discussion', label: 'Discussion', Icon: MegaphoneSimple },
]

export function PostTypeSelector() {
  const composer = useComposer()

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
      {TYPES.map(t => {
        const isActive = composer.postType === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => composer.setPostType(t.id)}
            className={
              'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-semibold whitespace-nowrap transition-all shrink-0 ' +
              (isActive
                ? 'bg-white text-black shadow-[0_2px_8px_rgba(255,255,255,0.2)]'
                : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:text-zinc-200')
            }
          >
            <t.Icon size={11} weight={isActive ? 'fill' : 'regular'} />
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
