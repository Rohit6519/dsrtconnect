'use client'

import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { DotsSixVertical, Briefcase } from '@phosphor-icons/react'

interface FeaturedWorkTabsProps {
  works: Array<{ id: string; title: string }>
  activeId: string | null
  isOwner: boolean
  onSelect: (id: string) => void
  onReorder: (newOrder: string[]) => void
}

export function FeaturedWorkTabs({
  works,
  activeId,
  isOwner,
  onSelect,
  onReorder,
}: FeaturedWorkTabsProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  if (works.length === 0) return null

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isOwner) return
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (!isOwner || !draggedId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id !== draggedId) setDragOverId(id)
  }

  const handleDragLeave = () => setDragOverId(null)

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!isOwner || !draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }

    const currentOrder = works.map((w) => w.id)
    const draggedIdx = currentOrder.indexOf(draggedId)
    const targetIdx = currentOrder.indexOf(targetId)
    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedId(null); setDragOverId(null); return
    }

    const newOrder = [...currentOrder]
    newOrder.splice(draggedIdx, 1)
    newOrder.splice(targetIdx, 0, draggedId)

    onReorder(newOrder)
    setDraggedId(null)
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div className="flex items-end gap-0.5 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-800 pb-0 -mb-px pr-2">
      {works.map((work) => {
        const isActive = work.id === activeId
        const isDraggingThis = draggedId === work.id
        const isDropTarget = dragOverId === work.id

        return (
          <div
            key={work.id}
            draggable={isOwner}
            onDragStart={(e) => handleDragStart(e, work.id)}
            onDragOver={(e) => handleDragOver(e, work.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, work.id)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(work.id)}
            className={cn(
              'group relative flex items-center gap-2 max-w-[200px] min-w-[120px]',
              'px-3 h-9 rounded-t-lg cursor-pointer transition-all',
              'border-t border-l border-r',
              isActive
                ? 'bg-zinc-900 border-zinc-700 text-white z-10'
                : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500 hover:bg-zinc-900/60 hover:text-zinc-300',
              isDraggingThis && 'opacity-40',
              isDropTarget && 'ring-2 ring-blue-500/50',
              isOwner && 'select-none',
            )}
            title={work.title}
          >
            {/* Drag handle for owner */}
            {isOwner && (
              <DotsSixVertical
                className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0 cursor-grab active:cursor-grabbing"
                weight="bold"
              />
            )}

            {/* Briefcase icon for visitor mode */}
            {!isOwner && (
              <Briefcase className={cn(
                'w-3 h-3 flex-shrink-0',
                isActive ? 'text-blue-400' : 'text-zinc-600',
              )} weight="fill" />
            )}

            {/* Title */}
            <span className={cn(
              'text-[11.5px] font-semibold truncate flex-1',
              isActive && 'text-white',
            )}>
              {work.title}
            </span>

            {/* Active indicator bar (bottom edge) */}
            {isActive && (
              <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-zinc-900" />
            )}
          </div>
        )
      })}
    </div>
  )
}