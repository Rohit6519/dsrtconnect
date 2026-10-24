'use client'

import { useState } from 'react'
import { CaretRight, CaretDown, Circle, EyeSlash, Plus, DotsThree, PencilSimple, Trash, ArrowsOutLineHorizontal } from '@phosphor-icons/react'

interface DocSection {
  id: string
  parent_id: string | null
  title: string
  slug: string | null
  position: number
  is_published: boolean
  reading_minutes?: number
  view_count?: number
}

interface Props {
  sections: DocSection[]
  activeSectionId: string | null
  isOwner: boolean
  onSelect: (id: string) => void
  onAdd: (parentId: string | null) => void
  onDelete: (id: string) => void
  onRename: (id: string, title: string) => void
  onTogglePublish: (id: string, next: boolean) => void
}

// Build tree from flat list
function buildTree(sections: DocSection[]): Map<string | null, DocSection[]> {
  const tree = new Map<string | null, DocSection[]>()
  const sorted = [...sections].sort((a, b) => a.position - b.position)
  for (const s of sorted) {
    const key = s.parent_id
    if (!tree.has(key)) tree.set(key, [])
    tree.get(key)!.push(s)
  }
  return tree
}

export function DocsSidebarTree({ sections, activeSectionId, isOwner, onSelect, onAdd, onDelete, onRename, onTogglePublish }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')

  const tree = buildTree(sections)

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const startRename = (s: DocSection) => {
    setRenamingId(s.id)
    setRenameDraft(s.title)
    setMenuOpenId(null)
  }

  const submitRename = () => {
    if (!renamingId) return
    const v = renameDraft.trim()
    if (v) onRename(renamingId, v)
    setRenamingId(null)
    setRenameDraft('')
  }

  const renderNode = (section: DocSection, depth: number = 0) => {
    const children = tree.get(section.id) || []
    const hasChildren = children.length > 0
    const isCollapsed = collapsed.has(section.id)
    const isActive = section.id === activeSectionId
    const isRenaming = renamingId === section.id

    return (
      <div key={section.id}>
        <div
          className={
            'group relative flex items-center gap-1 pr-2 py-1.5 rounded-md transition-colors cursor-pointer ' +
            (isActive
              ? 'bg-white/[0.06] text-white'
              : 'text-white/70 hover:text-white hover:bg-white/[0.03]')
          }
          style={{ paddingLeft: (8 + depth * 12) + 'px' }}
          onClick={() => !isRenaming && onSelect(section.id)}
        >
          {/* Caret / bullet */}
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleCollapse(section.id) }}
              className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-white/40 hover:text-white"
            >
              {isCollapsed ? <CaretRight size={11} weight="bold" /> : <CaretDown size={11} weight="bold" />}
            </button>
          ) : (
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              <Circle size={5} weight="fill" className={isActive ? 'text-white/80' : 'text-white/25'} />
            </div>
          )}

          {/* Title / rename input */}
          {isRenaming ? (
            <input
              autoFocus
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value.slice(0, 200))}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitRename()
                if (e.key === 'Escape') { setRenamingId(null); setRenameDraft('') }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 min-w-0 bg-white/[0.08] border border-white/25 rounded px-1.5 py-0.5 text-[13px] text-white outline-none focus:border-white/50"
            />
          ) : (
            <>
              <span className={'flex-1 min-w-0 truncate text-[13px] ' + (isActive ? 'font-semibold' : 'font-medium')}>
                {section.title}
              </span>
              {!section.is_published && (
                <EyeSlash size={10} className="text-white/30 flex-shrink-0" />
              )}
              {isOwner && (
                <div className="relative flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === section.id ? null : section.id) }}
                    className="w-5 h-5 flex items-center justify-center text-white/50 hover:text-white rounded"
                  >
                    <DotsThree size={13} weight="bold" />
                  </button>
                  {menuOpenId === section.id && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null) }} />
                      <div className="absolute z-40 top-6 right-0 w-[170px] bg-[#12121a] border border-white/[0.1] rounded-lg shadow-2xl py-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onAdd(section.id); setMenuOpenId(null) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/[0.05]"
                        >
                          <Plus size={11} weight="bold" /> Add sub-section
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); startRename(section) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/[0.05]"
                        >
                          <PencilSimple size={11} /> Rename
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onTogglePublish(section.id, !section.is_published); setMenuOpenId(null) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/[0.05]"
                        >
                          <EyeSlash size={11} /> {section.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                        <div className="h-px bg-white/[0.06] my-1" />
                        <button
                          onClick={(e) => { e.stopPropagation(); onDelete(section.id); setMenuOpenId(null) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-300 hover:bg-red-500/10"
                        >
                          <Trash size={11} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        {hasChildren && !isCollapsed && (
          <div>{children.map(child => renderNode(child, depth + 1))}</div>
        )}
      </div>
    )
  }

  const topLevel = tree.get(null) || []

  return (
    <div className="space-y-0.5">
      {topLevel.length === 0 ? (
        <p className="text-[12px] text-white/40 py-2 px-2">No sections</p>
      ) : (
        topLevel.map(s => renderNode(s, 0))
      )}
    </div>
  )
}
