'use client'

import { useState, useEffect, useRef } from 'react'
import {
  PaperPlaneRight, Paperclip, ArrowBendUpLeft, ArrowBendDoubleUpLeft,
  ArrowBendUpRight, TextB, TextItalic, TextUnderline, Link as LinkIcon,
  CaretDown, Clock, X
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { LinkModal } from '@/components/mail/composer/LinkModal'

interface Props {
  threadId: string
  smartReplyIdentityId: string | null
  activeMode: 'reply' | 'reply_all' | 'forward' | null
  setActiveMode: (mode: 'reply' | 'reply_all' | 'forward' | null) => void
  onReplySent: () => void
  onExpandToFull: (mode: 'reply' | 'reply_all' | 'forward') => void
}

function buildPreset(hours: number, minutes = 0, dayOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + dayOffset)
  d.setHours(hours, minutes, 0, 0)
  return d
}

export function QuickReplyBar({
  threadId,
  smartReplyIdentityId,
  activeMode,
  setActiveMode,
  onReplySent,
  onExpandToFull,
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const savedRange = useRef<Range | null>(null)
  const [sending, setSending] = useState(false)
  const [hasContent, setHasContent] = useState(false)
  const [attachments, setAttachments] = useState<any[]>([])
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)

  useEffect(() => {
    if (!activeMode && editorRef.current) {
      editorRef.current.innerHTML = ''
      setHasContent(false)
      setAttachments([])
    }
  }, [activeMode])

  const persistSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange()
  }

  const restoreSelection = () => {
    const sel = window.getSelection()
    if (!sel || !savedRange.current) return
    editorRef.current?.focus()
    sel.removeAllRanges()
    sel.addRange(savedRange.current)
  }

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, value)
    persistSelection()
    updateContent()
  }

  const updateContent = () => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    setHasContent(
      Boolean(
        html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim().length > 0 ||
        attachments.length > 0
      )
    )
  }

  const canSend = hasContent && !sending

  const handleSend = async (scheduledSendAt?: Date) => {
    if (!canSend || !smartReplyIdentityId || !editorRef.current) return
    setSending(true)
    try {
      const bodyHtml = editorRef.current.innerHTML

      const res = await fetch(`/api/mail/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_identity_id: smartReplyIdentityId,
          body_html: bodyHtml,
          mode: activeMode || 'reply',
          attachments,
          scheduled_send_at: scheduledSendAt?.toISOString(),
        }),
      })

      if (!res.ok) throw new Error('Failed to send')

      if (scheduledSendAt) {
        toast.success(`Scheduled for ${scheduledSendAt.toLocaleString()}`)
      } else {
        toast.success('Reply sent')
      }

      setActiveMode(null)
      onReplySent()
    } catch (e: any) {
      toast.error(e.message || 'Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  const handleFileClick = () => fileInputRef.current?.click()

  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const filesArr = Array.from(files)

    for (const file of filesArr) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/mail/attachments/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        setAttachments((prev) => [...prev, {
          url: data.url,
          name: data.name,
          size: data.size,
          type: data.type,
          path: data.path,
        }])
        setHasContent(true)
      } catch (err: any) {
        toast.error(`${file.name}: ${err.message}`)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const applyLink = ({ url, text }: { url: string; text: string }) => {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(
      'insertHTML',
      false,
      `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>&nbsp;`
    )
    setLinkOpen(false)
    updateContent()
  }

  const executeList = (ordered: boolean) => {
    editorRef.current?.focus()
    restoreSelection()
    document.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList', false)
    persistSelection()
    updateContent()
  }

  // ─── Default State: Pills ───
  if (!activeMode) {
    return (
      <div className="flex items-center gap-3 pt-6 pb-12 pl-2 sm:pl-[54px]">
        <button
          onClick={() => setActiveMode('reply')}
          className="flex items-center gap-2 h-9 px-5 rounded-full border border-white/[0.15] text-[13.5px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <ArrowBendUpLeft className="w-4 h-4" />
          Reply
        </button>
        <button
          onClick={() => onExpandToFull('reply_all')}
          className="flex items-center gap-2 h-9 px-5 rounded-full border border-white/[0.15] text-[13.5px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <ArrowBendDoubleUpLeft className="w-4 h-4" />
          Reply all
        </button>
        <button
          onClick={() => onExpandToFull('forward')}
          className="flex items-center gap-2 h-9 px-5 rounded-full border border-white/[0.15] text-[13.5px] font-medium text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <ArrowBendUpRight className="w-4 h-4" />
          Forward
        </button>
      </div>
    )
  }

  // ─── Advanced Inline Reply Editor ───
  return (
    <div className="pt-6 pb-12 pl-2 sm:pl-[54px]">
      <div className="rounded-2xl border border-white/[0.15] bg-[#0a0a0f] overflow-hidden focus-within:border-white/[0.3] transition-colors shadow-xl">
        
        {/* Rich Editable Surface */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={updateContent}
          onKeyUp={persistSelection}
          onMouseUp={persistSelection}
          onBlur={persistSelection}
          className={cn(
            'w-full min-h-[140px] max-h-[400px] overflow-y-auto p-5',
            'text-[14px] text-white/90 leading-relaxed focus:outline-none',
            'prose prose-invert prose-sm max-w-none',
            'prose-p:my-2 prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6',
            'prose-a:text-blue-300 prose-a:underline'
          )}
          data-placeholder="Write your reply..."
          style={{ minHeight: '140px' }}
        />

        {/* Attachments Chips */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
            {attachments.map((att, i) => (
              <div key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/75">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{att.name}</span>
                <button
                  onClick={() => {
                    setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                    setTimeout(updateContent, 0)
                  }}
                  className="text-white/40 hover:text-red-400 ml-1"
                >
                  <X className="w-3 h-3" weight="bold" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border-t border-white/[0.08]">
          <div className="flex items-center gap-0.5">
            {/* Send + Schedule Split Button */}
            <div className="relative flex items-stretch">
              <button
                onClick={() => handleSend()}
                disabled={!canSend}
                className={cn(
                  'flex items-center gap-1.5 h-9 px-4 rounded-l-md font-bold text-[12.5px] transition-all',
                  'bg-blue-600 hover:bg-blue-500 text-white',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                {sending ? 'Sending...' : 'Send'}
                {!sending && <PaperPlaneRight className="w-3.5 h-3.5" weight="fill" />}
              </button>
              <button
                onClick={() => setScheduleOpen((v) => !v)}
                disabled={!canSend}
                className="w-8 h-9 rounded-r-md border-l border-black/20 bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center disabled:opacity-40"
                title="Schedule send"
              >
                <CaretDown className="w-3 h-3" weight="bold" />
              </button>

              {scheduleOpen && (
                <div className="absolute bottom-full left-0 mb-1.5 w-[240px] z-50 rounded-xl bg-[#121218] border border-white/[0.1] shadow-2xl overflow-hidden p-1">
                  <div className="px-2 pt-1 pb-1.5">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                      Schedule reply
                    </p>
                  </div>
                  {[
                    { label: 'Tomorrow morning', date: buildPreset(9, 0, 1) },
                    { label: 'Tomorrow afternoon', date: buildPreset(14, 0, 1) },
                    { label: 'Later this week', date: buildPreset(9, 0, 3) },
                  ].map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setScheduleOpen(false); handleSend(p.date) }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.06] text-left"
                    >
                      <Clock className="w-3.5 h-3.5 text-white/55" />
                      <div>
                        <p className="text-[12px] font-semibold text-white">{p.label}</p>
                        <p className="text-[10px] text-white/45">
                          {p.date.toLocaleString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-white/[0.08] mx-1.5" />

            {/* Formatting Tools */}
            <ToolbarBtn onClick={() => exec('bold')} title="Bold (⌘B)">
              <TextB className="w-4 h-4" weight="bold" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec('italic')} title="Italic (⌘I)">
              <TextItalic className="w-4 h-4" weight="bold" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => exec('underline')} title="Underline (⌘U)">
              <TextUnderline className="w-4 h-4" weight="bold" />
            </ToolbarBtn>
            <ToolbarBtn onClick={() => { persistSelection(); setLinkOpen(true) }} title="Insert link">
              <LinkIcon className="w-4 h-4" weight="bold" />
            </ToolbarBtn>
            <ToolbarBtn onClick={handleFileClick} title="Attach file">
              <Paperclip className="w-4 h-4" weight="bold" />
            </ToolbarBtn>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              hidden
              onChange={(e) => handleFilesUpload(e.target.files)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onExpandToFull(activeMode)}
              className="text-[11.5px] font-medium text-white/50 hover:text-white px-2 py-1"
              title="Open full composer"
            >
              Full composer
            </button>
            <button
              onClick={() => setActiveMode(null)}
              className="text-[12.5px] font-medium text-white/50 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/[0.05]"
            >
              Discard
            </button>
          </div>
        </div>
      </div>

      <LinkModal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onConfirm={applyLink}
      />
    </div>
  )
}

function ToolbarBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={title}
      className="w-8 h-8 rounded-md hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-colors"
    >
      {children}
    </button>
  )
}