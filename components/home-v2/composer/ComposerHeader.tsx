'use client'

import { X, CloudCheck, Cloud, Warning } from '@phosphor-icons/react'
import type { AutosaveStatus } from './hooks/useComposerAutosave'

interface Props {
  onClose: () => void
  autosaveStatus: AutosaveStatus
}

export function ComposerHeader({ onClose, autosaveStatus }: Props) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-[15px] font-bold text-white">Create post</h2>
        <SaveStatus status={autosaveStatus} />
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-8 h-8 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
  )
}

function SaveStatus({ status }: { status: AutosaveStatus }) {
  if (status === 'idle') return null
  if (status === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
        <Cloud size={10} weight="regular" className="animate-pulse" />
        Saving draft...
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-[10.5px] text-zinc-500">
        <CloudCheck size={10} weight="regular" />
        Draft saved
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10.5px] text-amber-400">
      <Warning size={10} weight="fill" />
      Save failed
    </span>
  )
}