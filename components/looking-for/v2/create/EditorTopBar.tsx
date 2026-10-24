'use client'

import { ArrowLeft, Eye, PaperPlaneTilt, Cloud, CloudCheck, Warning } from '@phosphor-icons/react'
import { ContextSelector } from './ContextSelector'
import type { SaveStatus } from './hooks/useAutosave'

interface Props {
  draft: any
  saveStatus: SaveStatus
  lastSavedAt: Date | null
  onUpdate: (patch: any) => void
  onPreview: () => void
  onPublish: () => void
  onBack: () => void
}

export function EditorTopBar({
  draft, saveStatus, lastSavedAt,
  onUpdate, onPreview, onPublish, onBack,
}: Props) {
  return (
    <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Back + Context */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <ArrowLeft size={13} weight="bold" />
            Looking For
          </button>

          <span className="text-zinc-700 shrink-0">·</span>

          <ContextSelector
            posterContext={draft?.poster_context}
            projectId={draft?.project_id}
            ventureId={draft?.venture_id}
            onChange={(ctx, id) => {
              onUpdate({
                poster_context: ctx,
                project_id: ctx === 'project' ? id : null,
                venture_id: ctx === 'venture' ? id : null,
              })
            }}
          />
        </div>

        {/* Right: Save status + Preview + Publish */}
        <div className="flex items-center gap-3 shrink-0">
          <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />

          <div className="w-px h-6 bg-zinc-800" />

          <button
            onClick={onPreview}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <Eye size={12} weight="regular" />
            Preview
          </button>

          <button
            onClick={onPublish}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-white text-black hover:bg-zinc-100 text-[12.5px] font-bold transition-colors shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
          >
            <PaperPlaneTilt size={12} weight="fill" />
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}

function SaveStatusIndicator({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: Date | null }) {
  if (status === 'saving') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-500">
        <Cloud size={11} weight="regular" className="animate-pulse" />
        Saving...
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11.5px] text-amber-400">
        <Warning size={11} weight="fill" />
        Save failed
      </div>
    )
  }
  if (status === 'saved' && lastSavedAt) {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-500">
        <CloudCheck size={11} weight="regular" />
        Saved
      </div>
    )
  }
  return null
}