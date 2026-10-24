'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Clock, ArrowCounterClockwise, Plus, PencilSimple, Eye, EyeSlash, ArrowsClockwise, GitCommit, Sparkle } from '@phosphor-icons/react'
import { DocRevisionDiff } from './DocRevisionDiff'

interface Revision {
  id: string
  version: number
  title: string
  is_published: boolean
  change_type: string
  chars_added: number
  chars_removed: number
  created_at: string
  author_id: string | null
  author_name: string | null
  author_username: string | null
  author_avatar: string | null
}

interface Props {
  slug: string
  docId: string
  currentTitle: string
  isOwner: boolean
  onClose: () => void
  onReverted: () => void
}

const CHANGE_ICONS: Record<string, any> = {
  create: Plus,
  edit: PencilSimple,
  revert: ArrowCounterClockwise,
  publish: Eye,
  unpublish: EyeSlash,
  move: ArrowsClockwise,
}

const CHANGE_COLORS: Record<string, string> = {
  create: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
  edit: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  revert: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  publish: 'text-green-400 bg-green-500/10 border-green-500/25',
  unpublish: 'text-zinc-400 bg-white/[0.06] border-white/[0.1]',
  move: 'text-purple-400 bg-purple-500/10 border-purple-500/25',
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
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function DocVersionHistory({ slug, docId, currentTitle, isOwner, onClose, onReverted }: Props) {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [compareVersion, setCompareVersion] = useState<number | null>(null)
  const [selectedContent, setSelectedContent] = useState<string>('')
  const [compareContent, setCompareContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [reverting, setReverting] = useState(false)

  const fetchRevisions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects/' + slug + '/documentation/' + docId + '/revisions')
      const json = await res.json()
      const list: Revision[] = json.revisions || []
      setRevisions(list)
      if (list.length > 0) {
        setSelectedVersion(list[0].version)
        if (list.length > 1) setCompareVersion(list[1].version)
      }
    } finally { setLoading(false) }
  }, [slug, docId])

  useEffect(() => { fetchRevisions() }, [fetchRevisions])

  // Load selected + compare content
  useEffect(() => {
    if (selectedVersion === null) return
    setContentLoading(true)
    const loadOne = async (v: number) => {
      const res = await fetch('/api/projects/' + slug + '/documentation/' + docId + '/revisions/' + v)
      const j = await res.json()
      return j.revision?.content || ''
    }
    Promise.all([
      loadOne(selectedVersion),
      compareVersion !== null ? loadOne(compareVersion) : Promise.resolve(''),
    ]).then(([sel, cmp]) => {
      setSelectedContent(sel)
      setCompareContent(cmp)
    }).finally(() => setContentLoading(false))
  }, [selectedVersion, compareVersion, slug, docId])

  const revert = async (version: number) => {
    if (!confirm('Revert to version ' + version + '? A new revision will be created with the old content.')) return
    setReverting(true)
    try {
      const res = await fetch('/api/projects/' + slug + '/documentation/' + docId + '/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      if (!res.ok) { alert('Revert failed'); return }
      onReverted()
      await fetchRevisions()
    } finally { setReverting(false) }
  }

  const selectedRev = revisions.find(r => r.version === selectedVersion)

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-stretch">
      <div className="bg-[#0f0f18] border-l border-white/[0.08] w-full max-w-[1200px] ml-auto flex overflow-hidden">
        {/* LEFT: revision list */}
        <div className="w-[320px] flex-shrink-0 border-r border-white/[0.08] flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <GitCommit size={16} weight="fill" className="text-purple-300" />
              <h3 className="text-[14px] font-semibold text-white">Revision history</h3>
            </div>
            <span className="text-[11px] text-white/40 bg-white/[0.04] border border-white/[0.06] rounded-full px-2 py-0.5">
              {revisions.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-[12px] text-white/45 text-center">Loading history...</div>
            ) : revisions.length === 0 ? (
              <div className="p-4 text-[12px] text-white/45 text-center">No revisions yet</div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {revisions.map(r => {
                  const Icon = CHANGE_ICONS[r.change_type] || PencilSimple
                  const colorCls = CHANGE_COLORS[r.change_type] || CHANGE_COLORS.edit
                  const isSelected = r.version === selectedVersion
                  const isCompare = r.version === compareVersion
                  return (
                    <div
                      key={r.id}
                      className={
                        'group px-4 py-3 cursor-pointer transition-colors ' +
                        (isSelected ? 'bg-white/[0.06] border-l-2 border-purple-500' :
                         isCompare ? 'bg-white/[0.03] border-l-2 border-orange-500' :
                         'hover:bg-white/[0.02] border-l-2 border-transparent')
                      }
                      onClick={() => {
                        if (isSelected) return
                        if (selectedVersion !== null && !isCompare) setCompareVersion(selectedVersion)
                        setSelectedVersion(r.version)
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className={'w-6 h-6 rounded flex items-center justify-center border flex-shrink-0 mt-0.5 ' + colorCls}>
                          <Icon size={11} weight="bold" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[10px] font-bold font-mono text-white/50">v{r.version}</span>
                            <span className={'text-[9px] font-bold uppercase tracking-wider ' + colorCls.split(' ')[0]}>
                              {r.change_type}
                            </span>
                          </div>
                          <p className="text-[12px] text-white/85 truncate">
                            {r.author_name || 'Anonymous'}
                          </p>
                          <p className="text-[11px] text-white/45 mt-0.5" title={fullDate(r.created_at)}>
                            {timeAgo(r.created_at)}
                          </p>
                          {(r.chars_added > 0 || r.chars_removed > 0) && (
                            <div className="flex items-center gap-2 mt-1 text-[10px]">
                              {r.chars_added > 0 && <span className="text-emerald-400">+{r.chars_added}</span>}
                              {r.chars_removed > 0 && <span className="text-red-400">-{r.chars_removed}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border-t border-white/[0.06] p-3 flex-shrink-0 text-[10px] text-white/40 leading-snug">
            💡 Click any revision to preview. Click another to compare.
          </div>
        </div>

        {/* RIGHT: preview / diff */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-[14px] font-semibold text-white truncate">
                {compareVersion !== null && selectedVersion !== null ? (
                  <>Comparing <span className="text-orange-300">v{compareVersion}</span> → <span className="text-purple-300">v{selectedVersion}</span></>
                ) : selectedVersion !== null ? (
                  <>Preview: <span className="text-purple-300">v{selectedVersion}</span></>
                ) : 'Select a revision'}
              </h3>
              {selectedRev && (
                <span className="text-[11px] text-white/50 hidden md:block">
                  by {selectedRev.author_name || 'Anonymous'} · {fullDate(selectedRev.created_at)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {compareVersion !== null && (
                <button
                  onClick={() => setCompareVersion(null)}
                  className="text-[11px] text-white/60 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-md px-2 h-7"
                >
                  Exit compare
                </button>
              )}
              {isOwner && selectedVersion !== null && selectedVersion !== revisions[0]?.version && (
                <button
                  onClick={() => revert(selectedVersion)}
                  disabled={reverting}
                  className="flex items-center gap-1.5 text-[12px] font-semibold bg-orange-500/15 border border-orange-500/30 text-orange-300 hover:bg-orange-500/25 rounded-md px-3 h-8 disabled:opacity-50"
                >
                  <ArrowCounterClockwise size={12} weight="bold" /> {reverting ? 'Reverting...' : 'Revert to v' + selectedVersion}
                </button>
              )}
              <button onClick={onClose} className="text-white/50 hover:text-white p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {contentLoading ? (
              <div className="text-[12px] text-white/45 text-center py-8">Loading content...</div>
            ) : compareVersion !== null && selectedVersion !== null ? (
              <DocRevisionDiff oldContent={compareContent} newContent={selectedContent} />
            ) : selectedContent ? (
              <div className="prose prose-invert prose-sm max-w-none text-[13px] text-white/85 leading-relaxed prose-headings:text-white">
                <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed">{selectedContent}</pre>
              </div>
            ) : (
              <div className="text-[12px] text-white/45 text-center py-8">Select a revision to preview.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
