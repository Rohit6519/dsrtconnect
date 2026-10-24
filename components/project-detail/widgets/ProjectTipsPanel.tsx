'use client'

import { useState, useEffect } from 'react'
import { Lightbulb, ArrowSquareOut, X } from '@phosphor-icons/react'

interface Tip {
  id: string
  category: string
  title: string
  body: string
  link_url?: string
  link_label?: string
}

interface Props {
  stage?: string | null
  projectType?: string | null
  domain?: string | null
  isOwner: boolean
}

export function ProjectTipsPanel({ stage, projectType, domain, isOwner }: Props) {
  const [tips, setTips] = useState<Tip[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOwner) return

    const params = new URLSearchParams()
    if (stage) params.set('stage', stage)
    if (projectType) params.set('type', projectType)
    if (domain) params.set('domain', domain)
    params.set('limit', '3')

    fetch(`/api/projects/tips?${params.toString()}`)
      .then(r => r.json())
      .then(d => setTips(d.tips || []))
      .catch(() => {})
  }, [stage, projectType, domain, isOwner])

  if (!isOwner || tips.length === 0) return null

  const visibleTips = tips.filter(t => !dismissed.has(t.id))
  if (visibleTips.length === 0) return null

  return (
    <div className="space-y-3 mb-5">
      {visibleTips.map(tip => (
        <div
          key={tip.id}
          className="bg-white/[0.03] border border-white/[0.08] rounded-xl px-5 py-4 relative group"
        >
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(tip.id))}
            className="absolute top-3 right-3 w-6 h-6 rounded-md text-white/30 hover:text-white hover:bg-white/[0.06] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
          >
            <X size={12} weight="bold" />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Lightbulb size={14} weight="fill" className="text-white/50" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9.5px] font-mono uppercase tracking-widest text-white/40 font-bold mb-1">
                {tip.category}
              </p>
              <p className="text-[13px] font-semibold text-white leading-snug mb-1">
                {tip.title}
              </p>
              <p className="text-[12px] text-white/60 leading-relaxed">
                {tip.body}
              </p>
              {tip.link_url && (
                <a
                  href={tip.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/70 hover:text-white mt-2 transition-colors"
                >
                  {tip.link_label || 'Learn more'} <ArrowSquareOut size={10} />
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}