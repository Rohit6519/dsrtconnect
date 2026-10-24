'use client'

import { useState, useRef } from 'react'
import { MediaCarousel, type MediaItem } from './MediaCarousel'
import { cn } from '@/lib/utils'
import { PencilSimple, Trash, DotsSixVertical } from '@phosphor-icons/react'

interface FeaturedWorkCardCompactProps {
  work: {
    id: string
    title: string
    description_html?: string | null
    media?: MediaItem[]
  }
  isOwner: boolean
  isDragging?: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export function FeaturedWorkCardCompact({
  work,
  isOwner,
  isDragging,
  onOpen,
  onEdit,
  onDelete,
}: FeaturedWorkCardCompactProps) {
  const hasMedia = (work.media && work.media.length > 0)
  const hasDescription = !!(work.description_html && work.description_html.trim())

  return (
    <div
      className={cn(
        'w-[85vw] sm:w-[400px] flex-shrink-0',
        'bg-gradient-to-b from-zinc-900/40 via-zinc-950/40 to-zinc-950/60',
        'border border-zinc-800/60 rounded-2xl overflow-hidden',
        'shadow-[0_1px_0_rgba(255,255,255,0.025)_inset,0_2px_10px_rgba(0,0,0,0.25)]',
        'transition-all duration-150 group',
        isDragging ? 'opacity-40' : 'opacity-100',
        !isDragging && 'hover:border-zinc-700/80 hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)]',
      )}
    >
      {/* Media (click to open detail) */}
      {hasMedia && (
        <div className="cursor-pointer" onClick={onOpen}>
          <MediaCarousel
            media={work.media || []}
            title={work.title}
            compact
            onMediaClick={onOpen}
            disableLightbox
          />
        </div>
      )}

      {/* Body — click to open detail */}
      <div className="p-3 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-[14px] font-bold text-white tracking-tight leading-tight flex-1 min-w-0">
            {work.title}
          </h3>

          {/* Owner controls */}
          {isOwner && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Edit"
              >
                <PencilSimple className="w-3 h-3" weight="bold" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete"
              >
                <Trash className="w-3 h-3" weight="bold" />
              </button>
            </div>
          )}
        </div>

        {hasDescription ? (
          <div
            className={cn(
              'text-[12px] text-zinc-400 leading-[1.55] line-clamp-3',
              '[&_p]:my-0 [&_h1]:text-[13px] [&_h1]:font-bold [&_h2]:text-[12.5px] [&_h2]:font-bold',
              '[&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4',
              '[&_strong]:text-zinc-300 [&_a]:text-blue-400',
            )}
            dangerouslySetInnerHTML={{ __html: work.description_html || '' }}
          />
        ) : (
          <p className="text-[11px] text-zinc-600 italic">No description added</p>
        )}

        {/* Read more indicator */}
        {hasDescription && (
          <p className="text-[10px] text-blue-400 mt-2 font-semibold">
            Click to view full →
          </p>
        )}
      </div>
    </div>
  )
}