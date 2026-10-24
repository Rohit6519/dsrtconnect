'use client'

import { House, Plus } from '@phosphor-icons/react'
import { DsrtButton } from '@/components/dsrt'

interface Props {
  currentUser: any
}

export function HomeHeader({ currentUser }: Props) {
  const openComposer = () => document.getElementById('home-composer-bar')?.click()

  return (
    <div className="py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
          <House size={16} weight="fill" className="text-white" />
        </div>
        <h2 className="text-[15px] sm:text-base font-semibold text-white tracking-tight">
          Home Feed
        </h2>
      </div>

      <DsrtButton variant="white" size="sm" onClick={openComposer}>
        <Plus size={16} weight="bold" />
        <span className="hidden sm:inline">Create Post</span>
      </DsrtButton>
    </div>
  )
}