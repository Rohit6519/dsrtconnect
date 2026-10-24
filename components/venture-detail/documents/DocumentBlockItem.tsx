'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, Trash, Image as ImageIcon, Video, Paperclip, Globe, Table } from '@phosphor-icons/react'

export interface BlockData {
  id: string
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered_list' | 'checklist' | 'divider' | 'callout' | 'quote' | 'code' | 'image' | 'video' | 'file' | 'embed' | 'table'
  content: string
  checked?: boolean
  number?: number
  asset_id?: string
  url?: string
  caption?: string
  rows?: string[][]
}

interface Props {
  block: BlockData
  isOwner: boolean
  onUpdate: (updatedBlock: Partial<BlockData>) => void
  onAddAfter: (type?: BlockData['type']) => void
  onDelete: () => void
  onOpenMediaLibrary?: (onSelect: (assetUrl: string, assetId: string, type: 'image' | 'video' | 'file') => void) => void
}

export function DocumentBlockItem({ block, isOwner, onUpdate, onAddAfter, onDelete, onOpenMediaLibrary }: Props) {
  const [showCommands, setShowCommands] = useState(false)
  const [commandQuery, setCommandQuery] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const commandItems: { type: BlockData['type']; label: string; icon: string; desc: string }[] = [
    { type: 'heading1', label: 'Heading 1', icon: 'H1', desc: 'Large section heading' },
    { type: 'heading2', label: 'Heading 2', icon: 'H2', desc: 'Medium section heading' },
    { type: 'heading3', label: 'Heading 3', icon: 'H3', desc: 'Small subsection heading' },
    { type: 'paragraph', label: 'Text', icon: 'T', desc: 'Plain content block' },
    { type: 'bullet', label: 'Bullet List', icon: '•', desc: 'Simple bulleted list' },
    { type: 'numbered_list', label: 'Numbered List', icon: '1.', desc: 'Sequential list of items' },
    { type: 'checklist', label: 'Checklist', icon: '☑', desc: 'Interactive checkbox item' },
    { type: 'divider', label: 'Divider', icon: '—', desc: 'Horizontal separation line' },
    { type: 'callout', label: 'Callout', icon: '💡', desc: 'Visual info warning card' },
    { type: 'quote', label: 'Quote', icon: '“', desc: 'Add a pull-quote block' },
    { type: 'code', label: 'Code Code', icon: '</>', desc: 'Code formatting syntax block' },
    { type: 'image', label: 'Image', icon: '🖼', desc: 'Embed rich media image' },
    { type: 'video', label: 'Video', icon: '📹', desc: 'Embed media asset video' },
    { type: 'file', label: 'File Upload', icon: '📎', desc: 'Attach downloadable document' },
    { type: 'embed', label: 'Embed Frame', icon: '🔗', desc: 'Embed content from other websites' },
    { type: 'table', label: 'Table Matrix', icon: '田', desc: 'Grid block' },
  ]

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommands) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowCommands(false)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const matches = commandItems.filter(item => item.label.toLowerCase().includes(commandQuery.toLowerCase()))
        if (matches.length > 0) {
          applyCommand(matches[0].type)
        } else {
          setShowCommands(false)
        }
      }
    } else {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onAddAfter('paragraph')
      }
    }
  }

  const applyCommand = (type: BlockData['type']) => {
    setShowCommands(false)
    if (type === 'divider') {
      onUpdate({ type: 'divider', content: '' })
    } else if (type === 'table') {
      onUpdate({
        type: 'table',
        content: '',
        rows: [
          ['Header 1', 'Header 2', 'Header 3'],
          ['Row A1', 'Row A2', 'Row A3'],
          ['Row B1', 'Row B2', 'Row B3']
        ]
      })
    } else if ((type === 'image' || type === 'video' || type === 'file') && onOpenMediaLibrary) {
      onOpenMediaLibrary((url, id, resolvedType) => {
        onUpdate({
          type: resolvedType,
          content: url,
          asset_id: id,
          caption: `Brand Asset for ${resolvedType}`
        })
      })
    } else {
      onUpdate({ type, content: '' })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.startsWith('/')) {
      setShowCommands(true)
      setCommandQuery(val.slice(1))
    } else {
      if (showCommands) setShowCommands(false)
    }
    onUpdate({ content: val })
  }

  const handleTableCellUpdate = (rowIndex: number, colIndex: number, text: string) => {
    const currentRows = block.rows ? [...block.rows] : [['']]
    currentRows[rowIndex] = [...currentRows[rowIndex]]
    currentRows[rowIndex][colIndex] = text
    onUpdate({ rows: currentRows })
  }

  return (
    <div className="group relative flex items-start gap-2 -ml-8">
      {isOwner && (
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 mt-1 transition-opacity z-10">
          <button
            onClick={() => onAddAfter()}
            className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white"
            title="Add Block Below"
          >
            <Plus size={11} weight="bold" />
          </button>
          <button
            onClick={onDelete}
            className="w-5 h-5 rounded hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-red-400"
            title="Delete Block"
          >
            <Trash size={11} />
          </button>
        </div>
      )}

      <div className="flex-1 min-w-0 relative">
        {/* Render Block Inputs Dynamically */}
        {block.type === 'heading1' && (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            readOnly={!isOwner}
            placeholder="Heading 1"
            rows={1}
            className="w-full bg-transparent text-[22px] font-bold text-white placeholder:text-zinc-700 focus:outline-none resize-none leading-tight"
          />
        )}

        {block.type === 'heading2' && (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            readOnly={!isOwner}
            placeholder="Heading 2"
            rows={1}
            className="w-full bg-transparent text-[18px] font-bold text-white placeholder:text-zinc-700 focus:outline-none resize-none leading-tight"
          />
        )}

        {block.type === 'heading3' && (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            readOnly={!isOwner}
            placeholder="Heading 3"
            rows={1}
            className="w-full bg-transparent text-[15px] font-bold text-white placeholder:text-zinc-700 focus:outline-none resize-none leading-tight"
          />
        )}

        {block.type === 'paragraph' && (
          <textarea
            ref={inputRef}
            value={block.content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            readOnly={!isOwner}
            placeholder="Type text or press / for commands..."
            rows={1}
            className="w-full bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
          />
        )}

        {block.type === 'bullet' && (
          <div className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1">•</span>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              readOnly={!isOwner}
              placeholder="List item..."
              rows={1}
              className="w-full bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {block.type === 'numbered_list' && (
          <div className="flex items-start gap-2">
            <span className="text-zinc-500 mt-1 font-mono text-[13px]">{block.number || 1}.</span>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              readOnly={!isOwner}
              placeholder="Sequential item..."
              rows={1}
              className="w-full bg-transparent text-[14px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {block.type === 'checklist' && (
          <div className="flex items-start gap-2.5">
            <input
              type="checkbox"
              checked={!!block.checked}
              disabled={!isOwner}
              onChange={(e) => onUpdate({ checked: e.target.checked })}
              className="mt-1.5 w-3.5 h-3.5 rounded border-zinc-800 bg-[#09090b] accent-white cursor-pointer"
            />
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              readOnly={!isOwner}
              placeholder="Task checklist item..."
              rows={1}
              className={`w-full bg-transparent text-[14px] placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed ${block.checked ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}
            />
          </div>
        )}

        {block.type === 'divider' && (
          <div className="py-4">
            <div className="h-px bg-white/[0.08] w-full" />
          </div>
        )}

        {block.type === 'callout' && (
          <div className="p-3.5 bg-[#121215] border border-white/[0.06] rounded-xl flex items-start gap-2.5 shadow-sm">
            <span className="text-sm mt-0.5">💡</span>
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              readOnly={!isOwner}
              placeholder="Callout information block..."
              rows={2}
              className="w-full bg-transparent text-[13.5px] text-zinc-200 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {block.type === 'quote' && (
          <div className="pl-3.5 border-l-2 border-white/40 italic">
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              readOnly={!isOwner}
              placeholder="Quote..."
              rows={2}
              className="w-full bg-transparent text-[14px] text-zinc-400 placeholder:text-zinc-700 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        )}

        {block.type === 'code' && (
          <div className="p-3.5 bg-[#09090b] border border-white/[0.06] rounded-xl font-mono">
            <textarea
              ref={inputRef}
              value={block.content}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              readOnly={!isOwner}
              placeholder="// Code block snippet"
              rows={3}
              className="w-full bg-transparent text-[12.5px] text-emerald-400 placeholder:text-zinc-700 focus:outline-none resize-none leading-normal font-mono"
            />
          </div>
        )}

        {block.type === 'image' && (
          <div className="rounded-xl overflow-hidden bg-[#121215] border border-white/[0.06] p-1.5 space-y-2">
            {block.content ? (
              <img src={block.content} alt={block.caption || 'Embedded asset'} className="w-full max-h-[350px] object-cover rounded-lg" />
            ) : (
              <button
                onClick={() => applyCommand('image')}
                className="w-full h-24 flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-white"
              >
                <ImageIcon size={20} />
                <span className="text-[12px] font-semibold">Select Image from Media Assets</span>
              </button>
            )}
            <input
              type="text"
              value={block.caption || ''}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              readOnly={!isOwner}
              placeholder="Write a caption..."
              className="w-full bg-transparent text-[11px] text-zinc-500 focus:outline-none px-1 py-0.5"
            />
          </div>
        )}

        {block.type === 'video' && (
          <div className="rounded-xl overflow-hidden bg-[#121215] border border-white/[0.06] p-1.5 space-y-2">
            {block.content ? (
              <video src={block.content} controls className="w-full max-h-[350px] rounded-lg" />
            ) : (
              <button
                onClick={() => applyCommand('video')}
                className="w-full h-24 flex flex-col items-center justify-center gap-1.5 text-zinc-500 hover:text-white"
              >
                <Video size={20} />
                <span className="text-[12px] font-semibold">Select Video from Media Assets</span>
              </button>
            )}
            <input
              type="text"
              value={block.caption || ''}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              readOnly={!isOwner}
              placeholder="Write a caption..."
              className="w-full bg-transparent text-[11px] text-zinc-500 focus:outline-none px-1 py-0.5"
            />
          </div>
        )}

        {block.type === 'file' && (
          <div className="p-3 bg-[#121215] border border-white/[0.06] rounded-xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="text-zinc-500" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-white truncate">{block.caption || 'Uploaded Attachment'}</p>
                <p className="text-[10px] text-zinc-500 font-mono">CANONICAL ASSET FILE</p>
              </div>
            </div>
            {block.content ? (
              <a href={block.content} download className="text-[11.5px] font-semibold text-white bg-zinc-800 border border-white/[0.08] hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors">
                Download
              </a>
            ) : (
              <button onClick={() => applyCommand('file')} className="text-[11.5px] font-semibold text-zinc-400 hover:text-white">
                Attach File
              </button>
            )}
          </div>
        )}

        {block.type === 'embed' && (
          <div className="p-2 bg-[#121215] border border-white/[0.06] rounded-xl space-y-2">
            <div className="flex items-center gap-2 px-2 py-1">
              <Globe size={14} className="text-zinc-500" />
              <input
                type="text"
                value={block.url || ''}
                onChange={(e) => onUpdate({ url: e.target.value })}
                readOnly={!isOwner}
                placeholder="Enter iframe embed URL..."
                className="w-full bg-transparent text-[12px] text-zinc-300 focus:outline-none"
              />
            </div>
            {block.url ? (
              <div className="rounded-lg overflow-hidden border border-white/5 bg-[#09090b] relative h-[250px]">
                <iframe src={block.url} className="w-full h-full border-0" />
              </div>
            ) : null}
          </div>
        )}

        {block.type === 'table' && (
          <div className="overflow-x-auto border border-white/[0.06] rounded-xl bg-[#121215] p-2">
            <table className="w-full text-left border-collapse text-[12.5px]">
              <tbody>
                {(block.rows || [['']]).map((row, rIdx) => (
                  <tr key={rIdx} className={rIdx === 0 ? 'bg-white/[0.02]' : 'border-t border-white/[0.04]'}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2 border-r border-white/[0.04] last:border-r-0">
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleTableCellUpdate(rIdx, cIdx, e.target.value)}
                          readOnly={!isOwner}
                          className="w-full bg-transparent text-white focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Slash Commands Dropdown Filter View */}
        {showCommands && (
          <div className="absolute left-0 top-full mt-1.5 z-[999] w-[260px] max-h-[300px] overflow-y-auto bg-[#121215] border border-white/[0.1] rounded-xl shadow-2xl p-1">
            <p className="text-[10px] font-mono font-semibold text-zinc-500 px-3 py-2 uppercase tracking-wider">Basic Blocks</p>
            {commandItems
              .filter(item => item.label.toLowerCase().includes(commandQuery.toLowerCase()))
              .map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => applyCommand(item.type)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <div className="w-7 h-7 rounded bg-[#09090b] border border-white/[0.06] flex items-center justify-center text-xs font-bold text-white">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[12.5px] font-bold text-white">{item.label}</p>
                    <p className="text-[10.5px] text-zinc-500">{item.desc}</p>
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}