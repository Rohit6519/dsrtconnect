'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Clock } from '@phosphor-icons/react'

interface Contributor {
  id: string | null
  name: string | null
  username: string | null
  avatar_url: string | null
  revision_count: number
  last_edit: string
}

interface Props {
  slug: string
  docId: string
  refreshKey?: number
}

function timeAgo(dateStr: string): string {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now.getTime() - d.getTime()) / 60000)
  if (diff < 1) return 'just now'
  if (diff < 60) return diff + 'm ago'
  const h = Math.floor(diff / 60)
  if (h < 24) return h + 'h ago'
  const days = Math.floor(h / 24)
  if (days < 7) return days + 'd ago'
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export function DocContributors({ slug, docId, refreshKey }: Props) {
  const [contributors, setContributors] = useState<Contributor[]>([])

  useEffect(() => {
    fetch('/api/projects/' + slug + '/documentation/' + docId + '/contributors')
      .then(r => r.json())
      .then(j => setContributors(j.contributors || []))
      .catch(() => setContributors([]))
  }, [slug, docId, refreshKey])

  if (contributors.length === 0) return null

  const sorted = [...contributors].sort((a, b) => new Date(b.last_edit).getTime() - new Date(a.last_edit).getTime())
  const topEditor = sorted[0]
  const visible = sorted.slice(0, 5)
  const overflow = sorted.length - visible.length

  return (
    <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06] mb-4">
      <div className="flex items-center gap-1.5 text-[11px] text-white/50 flex-shrink-0">
        <Users size={11} /> Contributors
      </div>
      <div className="flex -space-x-2">
        {visible.map(c => (
          <Link
            key={c.id || Math.random()}
            href={c.username ? '/profile/' + c.username : '#'}
            title={(c.name || 'Anonymous') + ' · ' + c.revision_count + ' edits'}
            className="w-6 h-6 rounded-full bg-white/[0.08] border-2 border-[#0f0f18] overflow-hidden flex-shrink-0 flex items-center justify-center hover:z-10 hover:scale-110 transition-transform"
          >
            {c.avatar_url ? (
              <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[10px] font-bold text-white/80">{(c.name || '?').charAt(0)}</span>
            )}
          </Link>
        ))}
        {overflow > 0 && (
          <div className="w-6 h-6 rounded-full bg-white/[0.06] border-2 border-[#0f0f18] flex items-center justify-center">
            <span className="text-[9px] font-bold text-white/60">+{overflow}</span>
          </div>
        )}
      </div>
      {topEditor && (
        <div className="text-[11px] text-white/50 flex items-center gap-1 min-w-0 truncate">
          <Clock size={10} className="flex-shrink-0" />
          Last edit by
          <Link href={topEditor.username ? '/profile/' + topEditor.username : '#'} className="text-white/80 hover:text-white font-medium truncate">
            {topEditor.name || 'Anonymous'}
          </Link>
          <span className="flex-shrink-0">· {timeAgo(topEditor.last_edit)}</span>
        </div>
      )}
    </div>
  )
}
