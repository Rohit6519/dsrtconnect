'use client'

import { useState, useEffect, useRef } from 'react'
import {
  PencilSimple, Check, X, Plus, Eye,
  TextB, TextItalic, TextUnderline, TextH, Link as LinkIcon,
  ListBullets, ListNumbers, Quotes, Code
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  venture: any
  isOwner: boolean
  onUpdate: (patch: any) => Promise<void>
}

const QUESTIONS = [
  {
    key: 'problem',
    label: 'The Problem',
    placeholder: 'What specific pain point are you solving? Why does this problem matter?',
    hint: 'Be concrete. Investors want to feel the pain your customers feel.',
  },
  {
    key: 'solution',
    label: 'Your Solution',
    placeholder: 'How does your product solve the problem uniquely?',
    hint: 'Explain your approach in plain language.',
  },
  {
    key: 'target_market',
    label: 'Who You Serve',
    placeholder: 'Who is your ideal customer? What is the market size?',
    hint: 'Be specific about your ICP and TAM.',
  },
  {
    key: 'why_now',
    label: 'Why Now',
    placeholder: 'What has changed in the world that makes this the right moment?',
    hint: 'Timing is everything. What tailwind are you riding?',
  },
  {
    key: 'unique_insight',
    label: 'Your Unfair Advantage',
    placeholder: 'What do you know that others do not? What makes your team uniquely capable?',
    hint: 'This is your moat — insight, network, technology, or experience.',
  },
  {
    key: 'vision',
    label: 'The Vision',
    placeholder: 'Where do you want to be in 5 years? What does winning look like?',
    hint: 'Paint the future you are building toward.',
  },
]

export function VentureQuestions({ venture, isOwner, onUpdate }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null)

  return (
    <>
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-[16px] font-bold text-white">Key Company Questions</h2>
          <p className="text-[12px] text-white/45 mt-0.5">The essentials investors, cofounders, and partners want to know</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUESTIONS.map(q => (
            <QuestionCard
              key={q.key}
              question={q}
              value={venture[q.key]}
              isOwner={isOwner}
              onEdit={() => setEditingKey(q.key)}
            />
          ))}
        </div>
      </div>

      {editingKey && (
        <QuestionEditor
          question={QUESTIONS.find(q => q.key === editingKey)!}
          initialValue={venture[editingKey] || ''}
          onClose={() => setEditingKey(null)}
          onSave={async (val) => {
            await onUpdate({ [editingKey]: val.trim() || null })
            setEditingKey(null)
          }}
        />
      )}
    </>
  )
}

function QuestionCard({ question, value, isOwner, onEdit }: {
  question: { key: string; label: string; placeholder: string; hint: string }
  value: string
  isOwner: boolean
  onEdit: () => void
}) {
  const hasValue = !!value

  return (
    <div className={
      'rounded-xl border transition-colors relative group ' +
      (hasValue ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]' : 'bg-white/[0.01] border-dashed border-white/[0.08]')
    }>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h4 className="text-[14px] font-bold text-white">{question.label}</h4>
            {!hasValue && (
              <p className="text-[11.5px] text-white/40 italic mt-0.5">{question.hint}</p>
            )}
          </div>
          {isOwner && hasValue && (
            <button onClick={onEdit} className="text-[11px] text-white/50 hover:text-white flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <PencilSimple size={12} />
            </button>
          )}
        </div>

        {hasValue ? (
          <div className="text-[13px] leading-relaxed text-white/80 whitespace-pre-wrap line-clamp-6" dangerouslySetInnerHTML={{ __html: renderInline(value) }} />
        ) : isOwner ? (
          <button onClick={onEdit}
            className="mt-1 text-[12px] font-semibold text-white/70 hover:text-white flex items-center gap-1 transition-colors">
            <Plus size={11} weight="bold" /> Answer
          </button>
        ) : (
          <p className="text-[12px] text-white/30 italic">Not answered yet.</p>
        )}
      </div>
    </div>
  )
}

function renderInline(md: string): string {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/`(.+?)`/g, '<code class="bg-white/[0.06] text-white/90 px-1 rounded text-[12px] font-mono">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-white underline">$1</a>')
    .replace(/\n/g, '<br />')
}

// ═════════════════════════════════════════════════════
// QUESTION EDITOR — Full lightbox with rich editor
// ═════════════════════════════════════════════════════
function QuestionEditor({ question, initialValue, onClose, onSave }: {
  question: { key: string; label: string; placeholder: string; hint: string }
  initialValue: string
  onClose: () => void
  onSave: (value: string) => Promise<void>
}) {
  const [content, setContent] = useState(initialValue)
  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const insertFormat = (before: string, after: string = before) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = content.slice(start, end)
    const newText = content.slice(0, start) + before + (selected || 'text') + after + content.slice(end)
    setContent(newText)
    setTimeout(() => {
      ta.focus()
      const pos = start + before.length + (selected || 'text').length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  const insertLine = (prefix: string) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const beforeCursor = content.slice(0, start)
    const lineStart = beforeCursor.lastIndexOf('\n') + 1
    const newText = content.slice(0, lineStart) + prefix + content.slice(lineStart)
    setContent(newText)
    setTimeout(() => {
      ta.focus()
      const pos = start + prefix.length
      ta.setSelectionRange(pos, pos)
    }, 0)
  }

  const insertLinkInText = () => {
    const url = prompt('Enter URL:')
    if (!url) return
    insertFormat('[', '](' + url + ')')
  }

  const save = async () => {
    setSaving(true)
    try {
      await onSave(content)
      toast.success(question.label + ' saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const renderMarkdown = (md: string) => {
    if (!md) return ''
    let html = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3 class="text-[16px] font-bold text-white mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-[18px] font-bold text-white mt-5 mb-2">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-[22px] font-bold text-white mt-6 mb-3">$1</h1>')
      .replace(/^> (.*$)/gim, '<blockquote class="border-l-2 border-white/30 pl-4 py-1 my-2 italic text-white/70">$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-white/85">$1</em>')
      .replace(/__(.+?)__/g, '<u class="underline">$1</u>')
      .replace(/`(.+?)`/g, '<code class="bg-white/[0.06] text-white/90 px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-white underline hover:opacity-80">$1</a>')
      .replace(/^\* (.+)$/gm, '<li class="ml-4 list-disc text-white/80 my-0.5">$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-white/80 my-0.5">$1</li>')
      .replace(/\n\n/g, '</p><p class="text-[14px] leading-relaxed text-white/80 mb-3">')
      .replace(/\n/g, '<br />')
    return '<p class="text-[14px] leading-relaxed text-white/80 mb-3">' + html + '</p>'
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-[17px] font-bold text-white">{question.label}</h2>
            <p className="text-[12px] text-white/50 mt-0.5">{question.hint}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-md hover:bg-white/[0.05] text-white/50 hover:text-white flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {/* Toolbar */}
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.08] rounded-t-lg px-2 py-1.5 border-b-0">
            <div className="flex items-center gap-0.5">
              <ToolBtn onClick={() => insertFormat('**')} icon={TextB} title="Bold (Ctrl+B)" />
              <ToolBtn onClick={() => insertFormat('*')} icon={TextItalic} title="Italic (Ctrl+I)" />
              <ToolBtn onClick={() => insertFormat('__')} icon={TextUnderline} title="Underline" />
              <Divider />
              <ToolBtn onClick={() => insertLine('# ')} icon={TextH} title="Heading" />
              <ToolBtn onClick={insertLinkInText} icon={LinkIcon} title="Link" />
              <Divider />
              <ToolBtn onClick={() => insertLine('* ')} icon={ListBullets} title="Bullet List" />
              <ToolBtn onClick={() => insertLine('1. ')} icon={ListNumbers} title="Numbered List" />
              <ToolBtn onClick={() => insertLine('> ')} icon={Quotes} title="Quote" />
              <ToolBtn onClick={() => insertFormat('`')} icon={Code} title="Code" />
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={() => setPreview(false)}
                className={'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ' + (!preview ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white')}>
                <PencilSimple size={11} /> Write
              </button>
              <button onClick={() => setPreview(true)}
                className={'flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors ' + (preview ? 'bg-white/[0.1] text-white' : 'text-white/50 hover:text-white')}>
                <Eye size={11} /> Preview
              </button>
            </div>
          </div>

          {/* Editor area — SPACIOUS */}
          <div className="flex-1 min-h-[420px] bg-white/[0.02] border border-white/[0.08] rounded-b-lg overflow-hidden">
            {preview ? (
              <div className="h-full overflow-y-auto p-6">
                {content ? (
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
                ) : (
                  <p className="text-[13px] text-white/30 italic">Nothing to preview yet.</p>
                )}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                autoFocus
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={5000}
                placeholder={question.placeholder}
                className="w-full h-full min-h-[420px] bg-transparent px-6 py-5 text-[14.5px] leading-relaxed text-white placeholder:text-white/30 focus:outline-none resize-none font-normal"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); insertFormat('**') }
                  if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); insertFormat('*') }
                }}
              />
            )}
          </div>

          <div className="flex items-center justify-between pt-3 text-[11px] text-white/40">
            <span>Markdown supported · Ctrl+B, Ctrl+I, Ctrl+S</span>
            <span>{content.length.toLocaleString()} / 5,000 chars</span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.08] flex items-center justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="text-[13px] font-semibold text-white/60 hover:text-white px-4 h-9">Cancel</button>
          <button onClick={save} disabled={saving}
            className="text-[13px] font-semibold text-black bg-white hover:bg-white/90 disabled:opacity-50 px-4 h-9 rounded-lg flex items-center gap-1.5">
            <Check size={13} weight="bold" /> {saving ? 'Saving...' : 'Save Answer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ onClick, icon: Icon, title }: { onClick: () => void; icon: any; title: string }) {
  return (
    <button onClick={onClick} type="button" title={title}
      className="w-7 h-7 rounded hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors">
      <Icon size={12} weight="regular" />
    </button>
  )
}

function Divider() {
  return <span className="w-px h-4 bg-white/[0.1] mx-1" />
}