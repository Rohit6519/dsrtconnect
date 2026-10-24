'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight, ArrowSquareOut, Star, BookmarkSimple, Wrench } from '@phosphor-icons/react'

interface Resource {
  id: string
  title: string
  provider: string
  category: string
  url: string
  description?: string
  is_hidden_gem?: boolean
}

export function ProjectTechnicalMarquee({ resources }: { resources: Resource[] }) {
  const [isPaused, setIsPaused] = useState(false)
  const [duplicated, setDuplicated] = useState<Resource[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (resources.length > 0) {
      setDuplicated([...resources, ...resources, ...resources])
    }
  }, [resources])

  useEffect(() => {
    fetch('/api/projects/resources/save')
      .then(r => r.json())
      .then(d => setSavedIds(new Set(d.saved || [])))
      .catch(() => {})
  }, [])

  const handleToggleSave = async (resourceId: string, wasSaved: boolean) => {
    setSavedIds(prev => {
      const next = new Set(prev)
      if (wasSaved) next.delete(resourceId)
      else next.add(resourceId)
      return next
    })

    try {
      await fetch('/api/projects/resources/save', {
        method: wasSaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId })
      })
      toast.success(wasSaved ? 'Removed from saved' : 'Saved to your technical library')
    } catch {
      setSavedIds(prev => {
        const next = new Set(prev)
        if (wasSaved) next.add(resourceId)
        else next.delete(resourceId)
        return next
      })
      toast.error('Could not update saved status')
    }
  }

  if (resources.length === 0) return null

  return (
    <div className="mt-20 pt-12 border-t border-white/[0.08]">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#121215] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
            <Wrench size={16} weight="fill" className="text-zinc-400" />
          </div>
          <div>
            <h2 className="text-[19px] font-bold text-white">DSRT Technical Library</h2>
            <p className="text-[13.5px] text-zinc-500 mt-0.5">
              Engineering essays, system design guides, and hidden gems for builders.
            </p>
          </div>
        </div>
        <Link
          href="/resources"
          className="text-[12.5px] font-semibold text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          Explore library <ArrowRight size={11} />
        </Link>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#09090b] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#09090b] to-transparent pointer-events-none" />

        <div
          className="flex gap-4 py-2"
          style={{
            animation: `marquee-projects-scroll ${resources.length * 8}s linear infinite`,
            animationPlayState: isPaused ? 'paused' : 'running',
            width: 'fit-content',
          }}
        >
          {duplicated.map((item, idx) => {
            const isSaved = savedIds.has(item.id)
            return (
              <a
                key={`${item.id}-${idx}`}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex-shrink-0 w-[300px] p-5 bg-[#121215] border border-white/[0.06] hover:border-white/[0.16] rounded-xl transition-all block relative"
              >
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleToggleSave(item.id, isSaved)
                  }}
                  className={`absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isSaved
                      ? 'bg-white/[0.08] text-white'
                      : 'bg-transparent text-zinc-600 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  aria-label={isSaved ? 'Remove from saved' : 'Save'}
                >
                  <BookmarkSimple size={13} weight={isSaved ? 'fill' : 'regular'} />
                </button>

                <div className="flex items-center gap-2 mb-3 pr-8">
                  <p className="text-[9.5px] font-mono uppercase tracking-widest text-zinc-500 font-bold flex-1 truncate">
                    {item.category}
                  </p>
                  {item.is_hidden_gem && (
                    <Star size={11} weight="fill" className="text-zinc-400 shrink-0" />
                  )}
                </div>

                <p className="text-[13.5px] font-bold text-white group-hover:text-zinc-200 transition-colors leading-snug mb-2 line-clamp-2 min-h-[38px]">
                  {item.title}
                </p>

                {item.description && (
                  <p className="text-[11.5px] text-zinc-500 leading-relaxed line-clamp-2 mb-3 min-h-[30px]">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
                  <p className="text-[11px] text-zinc-400 font-semibold truncate">
                    {item.provider}
                  </p>
                  <ArrowSquareOut size={11} className="text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </a>
            )
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee-projects-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  )
}