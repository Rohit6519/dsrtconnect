'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { MediaCarousel, type MediaItem } from './MediaCarousel'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, PencilSimple, Briefcase } from '@phosphor-icons/react'

interface Work {
  id: string
  title: string
  description_html?: string | null
  media?: MediaItem[]
}

interface FeaturedWorkDetailLightboxProps {
  work: Work
  isOwner: boolean
  onClose: () => void
  onEdit: () => void
}

export function FeaturedWorkDetailLightbox({
  work,
  isOwner,
  onClose,
  onEdit,
}: FeaturedWorkDetailLightboxProps) {
  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const hasMedia = !!(work.media && work.media.length > 0)
  const hasDescription = !!(work.description_html && work.description_html.trim())

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.98, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-zinc-800/60 rounded-2xl w-full max-w-6xl overflow-hidden flex flex-col shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset,0_24px_64px_rgba(0,0,0,0.6)]"
        style={{ maxHeight: 'calc(100vh - 1rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-800/60 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Briefcase className="w-4 h-4 text-zinc-500 flex-shrink-0" weight="duotone" />
            <h2 className="text-[16px] font-bold text-white tracking-tight truncate">
              {work.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner && (
              <Button
                onClick={onEdit}
                variant="outline"
                className="h-8 px-3 border-zinc-700 bg-transparent text-zinc-300 hover:text-white text-[12px]"
              >
                <PencilSimple className="w-3.5 h-3.5 mr-1.5" weight="bold" />
                Edit
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" weight="bold" />
            </button>
          </div>
        </div>

        {/* Body — 2 panels */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Left: Media */}
          {hasMedia && (
            <div className="w-full md:w-[42%] flex-shrink-0 border-b md:border-b-0 md:border-r border-zinc-800/60 p-4 bg-black/30 overflow-y-auto">
              <MediaCarousel
                media={work.media || []}
                title={work.title}
                showTitleOverlay={false}
              />
            </div>
          )}

          {/* Right: Description */}
          <div className={cn(
            'flex-1 min-h-0 overflow-y-auto',
            hasMedia ? '' : 'md:col-span-2',
          )}>
            {hasDescription ? (
              <div
                className={cn(
                  'p-5 text-[14px] text-zinc-300 leading-[1.75]',
                  '[&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:my-3 [&_h1]:text-white [&_h1]:tracking-tight',
                  '[&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:my-3 [&_h2]:text-white [&_h2]:tracking-tight',
                  '[&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:my-2 [&_h3]:text-white [&_h3]:tracking-tight',
                  '[&_p]:my-2.5',
                  '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:space-y-1',
                  '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:space-y-1',
                  '[&_li]:leading-[1.65]',
                  '[&_strong]:text-white [&_strong]:font-bold',
                  '[&_b]:text-white [&_b]:font-bold',
                  '[&_a]:text-blue-400 [&_a]:underline [&_a]:decoration-blue-400/40',
                  '[&_blockquote]:border-l-2 [&_blockquote]:border-zinc-700 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-3',
                  '[&_pre]:bg-zinc-900 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto',
                  '[&_code]:bg-zinc-900 [&_code]:border [&_code]:border-zinc-800 [&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:font-mono',
                  '[&_img]:rounded-xl [&_img]:my-3 [&_img]:max-w-full [&_img]:border [&_img]:border-zinc-800',
                )}
                dangerouslySetInnerHTML={{ __html: work.description_html || '' }}
              />
            ) : (
              <div className="p-5 text-[13px] text-zinc-600 italic">
                No description added for this work.
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}