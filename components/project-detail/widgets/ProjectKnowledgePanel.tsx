'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen, FileText, Flask, BookmarkSimple, Notepad, LightbulbFilament, ArrowRight
} from '@phosphor-icons/react'

interface Props {
  slug: string
  projectId: string
  isOwner: boolean
}

const KIND_CONFIG: Record<string, { label: string; icon: any }> = {
  documentation: { label: 'Documentation', icon: FileText },
  research: { label: 'Research', icon: BookOpen },
  reference: { label: 'References', icon: BookmarkSimple },
  note: { label: 'Notes', icon: Notepad },
  experiment: { label: 'Experiments', icon: Flask },
  decision: { label: 'Decisions', icon: LightbulbFilament },
}

export function ProjectKnowledgePanel({ slug, projectId, isOwner }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${slug}/knowledge`)
      .then(r => r.json())
      .then(d => setCounts(d.counts || {}))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const totalItems = Object.values(counts).reduce((sum, c) => sum + c, 0)

  // Don't show if empty and not owner
  if (!loading && totalItems === 0 && !isOwner) return null

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <BookOpen size={14} weight="fill" className="text-white/50" />
          Knowledge
        </h3>
        {totalItems > 0 && (
          <span className="text-[11px] text-white/40 font-mono">{totalItems} items</span>
        )}
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
          ))}
        </div>
      ) : totalItems === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-[12px] text-white/40 mb-2">
            {isOwner ? 'No knowledge items yet.' : 'No knowledge items shared.'}
          </p>
          {isOwner && (
            <Link
              href={`/projects/${slug}?tab=documentation`}
              className="text-[11px] font-semibold text-white/60 hover:text-white"
            >
              Add documentation →
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {Object.entries(KIND_CONFIG).map(([kind, config]) => {
            const count = counts[kind] || 0
            if (count === 0) return null
            const Icon = config.icon
            return (
              <div key={kind} className="flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-2">
                  <Icon size={12} className="text-white/40" />
                  <span className="text-[13px] text-white/80">{config.label}</span>
                </div>
                <span className="text-[12px] font-semibold text-white tabular-nums">{count}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}