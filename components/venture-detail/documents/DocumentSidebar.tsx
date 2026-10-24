'use client'

import { useState } from 'react'
import {
  MagnifyingGlass, Plus, FileText, PushPin, Trash,
  CaretDown, CaretRight, Folder, FolderPlus
} from '@phosphor-icons/react'

interface Props {
  documents: any[]
  activeDocId: string | null
  loading: boolean
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  onSelectDoc: (id: string) => void
  onCreateDoc: (parentDocId?: string, category?: string) => void
  onDeleteDoc: (id: string) => void
  isOwner: boolean
}

const CATEGORIES = ['all', 'Product', 'Technology', 'Research', 'Roadmap', 'General']

export function DocumentSidebar({
  documents,
  activeDocId,
  loading,
  selectedCategory,
  onSelectCategory,
  onSelectDoc,
  onCreateDoc,
  onDeleteDoc,
  isOwner,
}: Props) {
  const [search, setSearch] = useState('')
  const [categoriesOpen, setCategoriesOpen] = useState(true)

  // Construct Recursive Document Folder Hierarchy
  const buildTree = (docs: any[], parentId: string | null = null): any[] => {
    return docs
      .filter(doc => doc.parent_document_id === parentId)
      .map(doc => ({
        ...doc,
        children: buildTree(docs, doc.id)
      }))
  }

  const pinnedDocs = documents.filter(d => d.is_pinned)
  const rootTree = buildTree(
    documents.filter(d => !d.is_pinned && (!search || d.title.toLowerCase().includes(search.toLowerCase())))
  )

  return (
    <div className="border-r border-zinc-800 bg-[#0d0d10] flex flex-col h-full">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-zinc-500 font-semibold">
            Knowledge Base
          </span>
          {isOwner && (
            <button
              onClick={() => onCreateDoc(undefined, 'General')}
              className="w-6 h-6 rounded bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white transition-colors"
              title="Create Root Document"
            >
              <Plus size={12} weight="bold" />
            </button>
          )}
        </div>

        <div className="relative">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search documents…"
            className="w-full h-8 pl-8 pr-2.5 bg-[#121215] border border-zinc-800 rounded-lg text-[12px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Categories Panel */}
      <div className="p-3 border-b border-zinc-800/60">
        <button
          onClick={() => setCategoriesOpen(!categoriesOpen)}
          className="flex items-center justify-between w-full text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2"
        >
          <span className="flex items-center gap-1.5"><Folder size={12} /> Categories</span>
          {categoriesOpen ? <CaretDown size={10} /> : <CaretRight size={10} />}
        </button>

        {categoriesOpen && (
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={
                  'text-[10.5px] font-semibold px-2 py-0.5 rounded transition-colors capitalize ' +
                  (selectedCategory === cat
                    ? 'bg-white text-black font-bold'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800')
                }
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* File Tree Hierarchy Display */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {pinnedDocs.length > 0 && (
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold px-2 mb-1 flex items-center gap-1">
              <PushPin size={10} /> Pinned
            </p>
            <div className="space-y-0.5">
              {pinnedDocs.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
                  active={doc.id === activeDocId}
                  onClick={() => onSelectDoc(doc.id)}
                  onDelete={() => onDeleteDoc(doc.id)}
                  onCreateChild={isOwner ? () => onCreateDoc(doc.id, doc.category) : undefined}
                  isOwner={isOwner}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold px-2 mb-1">
            Documents Nest Map
          </p>
          {loading ? (
            <p className="text-[11.5px] text-zinc-600 px-2 py-3">Loading docs…</p>
          ) : rootTree.length === 0 ? (
            <p className="text-[11.5px] text-zinc-600 px-2 py-3 italic">No documents found.</p>
          ) : (
            <div className="space-y-0.5">
              {rootTree.map(node => (
                <TreeNode
                  key={node.id}
                  node={node}
                  activeDocId={activeDocId}
                  onSelectDoc={onSelectDoc}
                  onDeleteDoc={onDeleteDoc}
                  onCreateChild={isOwner ? onCreateDoc : undefined}
                  isOwner={isOwner}
                  depth={0}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TreeNode({ node, activeDocId, onSelectDoc, onDeleteDoc, onCreateChild, isOwner, depth }: {
  node: any; activeDocId: string | null; onSelectDoc: (id: string) => void; onDeleteDoc: (id: string) => void; onCreateChild?: (parentDocId: string, category?: string) => void; isOwner: boolean; depth: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="space-y-0.5">
      <div style={{ paddingLeft: `${depth * 8}px` }}>
        <DocRow
          doc={node}
          active={node.id === activeDocId}
          onClick={() => onSelectDoc(node.id)}
          onDelete={() => onDeleteDoc(node.id)}
          onCreateChild={onCreateChild ? () => onCreateChild(node.id, node.category) : undefined}
          isOwner={isOwner}
          onToggleExpand={hasChildren ? () => setExpanded(!expanded) : undefined}
          expanded={expanded}
          hasChildren={hasChildren}
        />
      </div>

      {hasChildren && expanded && (
        <div className="space-y-0.5">
          {node.children.map((child: any) => (
            <TreeNode
              key={child.id}
              node={child}
              activeDocId={activeDocId}
              onSelectDoc={onSelectDoc}
              onDeleteDoc={onDeleteDoc}
              onCreateChild={onCreateChild}
              isOwner={isOwner}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DocRow({ doc, active, onClick, onDelete, onCreateChild, isOwner, onToggleExpand, expanded, hasChildren }: {
  doc: any; active: boolean; onClick: () => void; onDelete: () => void; onCreateChild?: () => void; isOwner: boolean; onToggleExpand?: () => void; expanded?: boolean; hasChildren?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={
        'group flex items-center justify-between px-2 py-1.5 rounded-lg text-[12.5px] cursor-pointer transition-colors ' +
        (active
          ? 'bg-[#121215] border border-white/[0.06] text-white font-semibold'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
      }
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {onToggleExpand ? (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="w-4 h-4 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500"
          >
            {expanded ? <CaretDown size={10} /> : <CaretRight size={10} />}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <span className="text-[13px] flex-shrink-0">{doc.icon || '📄'}</span>
        <span className="truncate">{doc.title}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isOwner && onCreateChild && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateChild(); }}
            className="text-zinc-500 hover:text-white p-1"
            title="Create Sub-Document Folder"
          >
            <FolderPlus size={11} />
          </button>
        )}
        {isOwner && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-zinc-500 hover:text-red-400 p-1"
            title="Delete Document"
          >
            <Trash size={11} />
          </button>
        )}
      </div>
    </div>
  )
}