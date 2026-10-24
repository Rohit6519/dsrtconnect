'use client'

import { MediaCarousel, type MediaItem } from './MediaCarousel'
import { cn } from '@/lib/utils'
import { PencilSimple, Trash } from '@phosphor-icons/react'

interface FeaturedWorkCardProps {
  work: {
    id: string
    title: string
    description_html?: string | null
    media?: MediaItem[]
  }
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function FeaturedWorkCard({
  work,
  isOwner,
  onEdit,
  onDelete,
}: FeaturedWorkCardProps) {
  const hasMedia = (work.media && work.media.length > 0)
  const hasDescription = !!(work.description_html && work.description_html.trim())

  return (
    <div className="bg-gradient-to-b from-zinc-900/40 via-zinc-950/40 to-zinc-950/60 border border-zinc-800/60 rounded-2xl shadow-[0_1px_0_rgba(255,255,255,0.025)_inset,0_2px_10px_rgba(0,0,0,0.25)] overflow-hidden group">
      {/* Header row (owner controls only) */}
      {isOwner && (
        <div className="flex items-center justify-end gap-1 px-4 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <PencilSimple className="w-3 h-3" weight="bold" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-1 h-7 px-2 rounded-lg text-[11px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash className="w-3 h-3" weight="bold" />
            Delete
          </button>
        </div>
      )}

      {/* Content: 2-col grid — media left, description right */}
      <div className={cn(
        'p-4 grid gap-4',
        hasMedia && hasDescription ? 'md:grid-cols-[minmax(0,42%)_minmax(0,58%)]' : 'grid-cols-1',
        !isOwner && 'pt-4',
      )}>
        {/* Media panel */}
        {hasMedia && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-2">
              Media
            </p>
            <MediaCarousel media={work.media || []} title={work.title} />
          </div>
        )}

        {/* Description panel */}
        {hasDescription ? (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-600 mb-2">
              Work Description
            </p>
            <h3 className="text-[17px] font-bold text-white tracking-tight mb-2">
              {work.title}
            </h3>
            <div
              className={cn(
                'text-[13.5px] text-zinc-300 leading-[1.7]',
                '[&_h1]:text-[18px] [&_h1]:font-bold [&_h1]:my-2 [&_h1]:text-white',
                '[&_h2]:text-[16px] [&_h2]:font-bold [&_h2]:my-2 [&_h2]:text-white',
                '[&_h3]:text-[14.5px] [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-white',
                '[&_p]:my-2',
                '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ul]:space-y-1',
                '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_ol]:space-y-1',
                '[&_strong]:text-white [&_strong]:font-bold',
                '[&_b]:text-white [&_b]:font-bold',
                '[&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-400/40 hover:[&_a]:decoration-blue-400',
                '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-2',
              )}
              dangerouslySetInnerHTML={{ __html: work.description_html || '' }}
            />
          </div>
        ) : hasMedia ? null : (
          <div>
            <h3 className="text-[17px] font-bold text-white tracking-tight">
              {work.title}
            </h3>
            <p className="text-[12px] text-zinc-600 italic mt-2">
              No description or media added yet
            </p>
          </div>
        )}
      </div>
    </div>
  )
}