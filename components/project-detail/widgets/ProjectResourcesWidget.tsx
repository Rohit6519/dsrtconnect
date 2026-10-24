'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  GithubLogo, Globe, FileText, Database,
  VideoCamera, PaintBrush, Link as LinkIcon, Plus, ArrowSquareOut, Trash,
  ArrowRight
} from '@phosphor-icons/react'

interface TypedResource {
  id: string
  title: string
  type: string
  url: string
  description?: string
}

interface Props {
  slug: string
  isOwner: boolean
}

const TYPE_ICONS: Record<string, any> = {
  repository: GithubLogo,
  demo: Globe,
  documentation: FileText,
  paper: FileText,
  dataset: Database,
  video: VideoCamera,
  design: PaintBrush,
  website: Globe,
  other: LinkIcon,
}

export function ProjectResourcesWidget({ slug, isOwner }: Props) {
  const [resources, setResources] = useState<TypedResource[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/projects/${slug}/resources-typed`)
      .then(r => r.json())
      .then(d => setResources(d.resources || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this resource?')) return
    setResources(prev => prev.filter(r => r.id !== id))
    await fetch(`/api/projects/${slug}/resources-typed?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }

  if (!loading && resources.length === 0 && !isOwner) return null

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <h3 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <LinkIcon size={14} weight="fill" className="text-white/50" />
          Resources
        </h3>
        <div className="flex items-center gap-2">
          {resources.length > 0 && (
            <span className="text-[11px] text-white/40 font-mono">{resources.length}</span>
          )}
          <Link
            href="/resources"
            className="text-[10px] font-mono uppercase tracking-wider text-white/40 hover:text-white transition-colors flex items-center gap-0.5"
          >
            Hub <ArrowRight size={9} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-4 w-full bg-white/[0.04] rounded animate-pulse" />
          ))}
        </div>
      ) : resources.length === 0 ? (
        <div className="px-4 py-5 text-center text-[12px] text-white/40">
          {isOwner ? 'No resources added yet.' : 'No resources shared.'}
        </div>
      ) : (
        <div className="divide-y divide-white/[0.05]">
          {resources.map(r => {
            const Icon = TYPE_ICONS[r.type] || LinkIcon
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.02] group">
                <Icon size={13} className="text-white/40 flex-shrink-0" />
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 text-[13px] text-white/80 hover:text-white truncate"
                >
                  {r.title}
                </a>
                <ArrowSquareOut size={11} className="text-white/30 flex-shrink-0" />
                {isOwner && (
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all"
                  >
                    <Trash size={11} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}