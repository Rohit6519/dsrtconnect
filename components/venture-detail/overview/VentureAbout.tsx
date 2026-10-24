'use client'

import { useState, useRef, useEffect } from 'react'
import {
  TextB, TextItalic, TextUnderline, TextH, Link as LinkIcon, ListBullets,
  ListNumbers, Quotes, Code, PencilSimple, Check, X, Eye
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  venture: any
  isOwner: boolean
  onUpdate: (patch: any) => Promise<void>
}

export function VentureAbout({ venture, isOwner, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(venture.description || '')
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => setContent(venture.description || ''), [venture.description])

  const insertFormat = (before: string, after: string = before) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(start, end)
    const newText = content.slice(0, start) + before + (selected || 'text') + after + content.slice(end)
    setContent(newText)
    setTimeout(() => {
      textarea.focus()
      const cursorPos = start + before.length + (selected || 'text').length
      textarea.setSelectionRange(cursorPos, cursorPos)
    }, 0)
  }

  const insertLine = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const beforeCursor = content.slice(0, start)
    const lineStart = beforeCursor.lastIndexOf('\n') + 1
    const newText = content.slice(0, lineStart) + prefix + content.slice(lineStart)
    setContent(newText)
    setTimeout(() => {
      textarea.focus()
      const pos = start + prefix.length
      textarea.setSelectionRange(pos, pos)
    }, 0)
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (!url) return
    insertFormat('[', '](' + url + ')')
  }

  const save = async () => {
    setSaving(true)
    try {
      await onUpdate({ description: content })
      toast.success('About updated')
      setEditing(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setContent(venture.description || '')
    setEditing(false)
    setPreview(false)
  }

  const renderMarkdown = (md: string) => {
    if (!md) return ''
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-[16px] font-bold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-[18px] font-bold text-white mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-[22px] font-bold text-white mt-6 mb-3">$1</h1>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-purple-500/40 pl-4 py-1 my-2 italic text-white/70">$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-white/85">$1</em>')
      .replace(/__(.+?)__/g, '<u class="underline">$1</u>')
      .replace(/`(.+?)`/g, '<code class="bg-white/[0.06] text-purple-200 px-1.5 py-0.5 rounded text-[12.5px] font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="text-purple-300 hover:text-purple-200 underline">$1</a>')
      .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-white/80 my-0.5">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-white/80 my-0.5">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-[14px] leading-relaxed text-white/80 mb-3">')
      .replace(/\n/g, '<br />')
    return '<p class="text-[14px] leading-relaxed text-white/80 mb-3">' + html + '</p>'
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold text-white">About the venture</h2>
          <p className="text-[12px] text-white/45 mt-0.5">Tell your story to investors, cofounders, and the community</p>
        </div>
        {isOwner && !editing && (
          <button onClick={() => setEditing(true)}
            className="text-[12px] font-semibold text-white/70 hover:text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] px-3 h-8 rounded-lg flex items-center gap-1.5 transition-colors">
            <PencilSimple size={12} /> {venture.description ? 'Edit' : 'Write'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="p-5 space-y-3">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              <ToolBtn onClick={() => insertFormat('**')} icon={TextB} title="Bold (Ctrl+B)" />
              <ToolBtn onClick={() => insertFormat('*')} icon={TextItalic} title="Italic (Ctrl+I)" />
              <ToolBtn onClick={() => insertFormat('__')} icon={TextUnderline} title="Underline" />
              <Divider />
              <ToolBtn onClick={() => insertLine('# ')} icon={TextH} title="Heading 1" />
              <ToolBtn onClick={() => insertLine('## ')} icon={TextH} title="Heading 2" small />
              <Divider />
              <ToolBtn onClick={insertLink} icon={LinkIcon} title="Insert Link" />
              <ToolBtn onClick={() => insertLine('* ')} icon={ListBullets} title="Bullet List" />
              <ToolBtn onClick={() => insertLine('1. ')} icon={ListNumbers} title="Numbered List" />
              <ToolBtn onClick={() => insertLine('> ')} icon={Quotes} title="Quote" />
              <ToolBtn onClick={() => insertFormat('`')} icon={Code} title="Inline Code" />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPreview(false)}
                className={'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold ' + (!preview ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white')}>
                <PencilSimple size={11} /> Write
              </button>
              <button onClick={() => setPreview(true)}
                className={'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold ' + (preview ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white')}>
                <Eye size={11} /> Preview
              </button>
            </div>
          </div>

          {/* Editor / Preview */}
          {preview ? (
            <div className="min-h-[320px] bg-white/[0.02] border border-white/[0.06] rounded-lg p-5 prose prose-invert max-w-none">
              {content ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
              ) : (
                <p className="text-[13px] text-white/30 italic">Nothing to preview yet.</p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              maxLength={10000}
              placeholder="Describe your venture in detail.

What problem are you solving? Who is it for? What makes you different?

Use **bold**, *italic*, [links](url), > quotes, lists, and more."
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-3 text-[14px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none focus:border-white/[0.15] resize-y font-normal"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); insertFormat('**') }
                if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); insertFormat('*') }
              }}
            />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-white/40">
              Markdown supported · {content.length.toLocaleString()} / 10,000 chars
            </p>
            <div className="flex items-center gap-2">
              <button onClick={cancel} className="text-[12px] font-semibold text-white/60 hover:text-white px-3 h-8">Cancel</button>
              <button onClick={save} disabled={saving}
                className="text-[12px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-50 px-4 h-8 rounded-lg flex items-center gap-1.5">
                <Check size={12} weight="bold" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      ) : venture.description ? (
        <div className="p-5">
          <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: renderMarkdown(venture.description) }} />
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-[13.5px] text-white/40">
            {isOwner ? 'No description yet. Share what makes your venture unique.' : 'The founder hasn\u2019t added a description yet.'}
          </p>
          {isOwner && (
            <button onClick={() => setEditing(true)} className="mt-3 text-[12.5px] font-semibold text-purple-300 hover:text-purple-200 inline-flex items-center gap-1.5">
              <PencilSimple size={11} /> Write description
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ToolBtn({ onClick, icon: Icon, title, small }: { onClick: () => void; icon: any; title: string; small?: boolean }) {
  return (
    <button onClick={onClick} title={title}
      className="w-7 h-7 rounded hover:bg-white/[0.08] text-white/70 hover:text-white flex items-center justify-center transition-colors">
      <Icon size={small ? 11 : 13} weight="regular" />
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-white/[0.1] mx-1" />
}