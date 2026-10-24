'use client'

import { Plus, GitFork, StackSimple, Cursor, DotsThreeOutline, ArrowsOutSimple, PencilSimple, Check } from '@phosphor-icons/react'

interface Props {
  isEditing: boolean
  isOwner: boolean
  connectingMode: boolean
  onToggleEdit: () => void
  onAddNode: () => void
  onToggleConnect: () => void
  onFit: () => void
  onAutoLayout: () => void
  onSave?: () => void
  hasUnsavedChanges?: boolean
}

export function TeamGraphToolbar({
  isEditing, isOwner, connectingMode,
  onToggleEdit, onAddNode, onToggleConnect,
  onFit, onAutoLayout, onSave, hasUnsavedChanges
}: Props) {
  return (
    <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-[#12121a]/95 backdrop-blur-md border border-white/[0.08] rounded-lg p-1 shadow-2xl">
      {isEditing && isOwner && (
        <>
          <button
            onClick={onAddNode}
            className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-purple-600 hover:bg-purple-500 text-white text-[12px] font-semibold transition-colors"
          >
            <Plus size={12} weight="bold" /> Add Node
          </button>

          <button
            onClick={onToggleConnect}
            className={
              'flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[12px] font-medium transition-colors ' +
              (connectingMode
                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200'
                : 'text-white/70 hover:text-white hover:bg-white/[0.06]')
            }
            title={connectingMode ? 'Cancel connect' : 'Draw connections'}
          >
            <GitFork size={12} /> Connect
          </button>

          <button
            onClick={onAutoLayout}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Auto arrange"
          >
            <StackSimple size={12} /> Auto Arrange
          </button>

          <div className="w-px h-5 bg-white/[0.08] mx-1" />
        </>
      )}

      <button
        onClick={onFit}
        className="flex items-center gap-1.5 px-2.5 h-8 rounded-md text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/[0.06] transition-colors"
        title="Fit view"
      >
        <ArrowsOutSimple size={12} /> Fit
      </button>

      {isOwner && (
        <>
          <div className="w-px h-5 bg-white/[0.08] mx-1" />
          {isEditing && hasUnsavedChanges && onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 h-8 rounded-md bg-white text-black text-[12px] font-semibold hover:bg-white/90 transition-colors"
            >
              <Check size={12} weight="bold" /> Save
            </button>
          )}
          <button
            onClick={onToggleEdit}
            className={
              'flex items-center gap-1.5 px-3 h-8 rounded-md text-[12px] font-semibold transition-colors ' +
              (isEditing
                ? 'bg-white/[0.08] text-white border border-white/[0.15]'
                : 'bg-white text-black hover:bg-white/90')
            }
          >
            <PencilSimple size={12} weight={isEditing ? 'regular' : 'bold'} />
            {isEditing ? 'Done editing' : 'Edit Graph'}
          </button>
        </>
      )}
    </div>
  )
}
