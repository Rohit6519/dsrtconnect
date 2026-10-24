'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useComposer } from './ComposerContext'
import {
  TextB, TextItalic, TextUnderline, TextStrikethrough,
  TextHOne, TextHTwo, TextHThree,
  ListBullets, ListNumbers,
  Quotes, Code, Minus, LinkSimple, TextT, X, Link as LinkIcon,
  TextAlignLeft, TextAlignCenter, TextAlignRight, TextAlignJustify,
} from '@phosphor-icons/react'

/**
 * Sanitize pasted HTML — strips Word/Google Docs garbage.
 */
function sanitizeHTML(html: string): string {
  if (!html) return ''
  let clean = html
    .replace(/<\?xml[^>]*>/gi, '')
    .replace(/<\/?o:[^>]*>/gi, '')
    .replace(/<\/?w:[^>]*>/gi, '')
    .replace(/<\/?meta[^>]*>/gi, '')
    .replace(/<\/?link[^>]*>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\s+style="[^"]*"/gi, '')
    .replace(/\s+style='[^']*'/gi, '')
    .replace(/\s+class="[^"]*"/gi, '')
    .replace(/\s+id="[^"]*"/gi, '')
    .replace(/\s+data-[a-z-]+="[^"]*"/gi, '')
    .replace(/\s+lang="[^"]*"/gi, '')
    .replace(/\s+xml:lang="[^"]*"/gi, '')
    .replace(/\s+dir="[^"]*"/gi, '')
    .replace(/<span[^>]*>/gi, '<span>')
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/\s+on\w+="[^"]*"/gi, '')
    .replace(/\s+on\w+='[^']*'/gi, '')
    .replace(/\s{2,}/g, ' ')
  return clean.trim()
}

export function RichEditor() {
  const composer = useComposer()
  const editorRef = useRef<HTMLDivElement>(null)

  const [linkModal, setLinkModal] = useState({ open: false, url: '', title: '' })
  const [savedRange, setSavedRange] = useState<Range | null>(null)

  useEffect(() => {
    if (editorRef.current && !editorRef.current.textContent && composer.content) {
      editorRef.current.innerHTML = composer.content
    }
  }, [])

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      composer.setContent(editorRef.current.innerHTML || '')
    }
  }, [composer])

  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    handleInput()
  }, [handleInput])

  const insertHeading = useCallback((level: string) => {
    editorRef.current?.focus()
    document.execCommand('formatBlock', false, level)
    handleInput()
  }, [handleInput])

  // ⚠️ CRITICAL: Sanitize pasted content (Word/Google Docs)
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const clipboardData = e.clipboardData
    const htmlData = clipboardData.getData('text/html')
    const textData = clipboardData.getData('text/plain')

    if (htmlData) {
      const cleanHTML = sanitizeHTML(htmlData)
      document.execCommand('insertHTML', false, cleanHTML)
    } else if (textData) {
      const safe = textData
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '<br/>')
        .join('')
      document.execCommand('insertHTML', false, safe)
    }
    handleInput()
  }, [handleInput])

  const openLinkModal = useCallback(() => {
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      setSavedRange(selection.getRangeAt(0))
      const highlightedText = selection.toString()
      setLinkModal({ open: true, url: '', title: highlightedText })
    } else {
      setLinkModal({ open: true, url: '', title: '' })
    }
  }, [])

  const confirmLink = useCallback(() => {
    if (!linkModal.url || !linkModal.title) return

    editorRef.current?.focus()

    if (savedRange) {
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(savedRange)
    }

    let finalUrl = linkModal.url
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl
    }

    const htmlPill = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 6px; background-color: rgba(59, 130, 246, 0.1); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); text-decoration: none; font-weight: 500; font-size: 15px; margin: 0 4px;">🔗 ${linkModal.title}</a>&nbsp;`

    document.execCommand('insertHTML', false, htmlPill)
    handleInput()
    setLinkModal({ open: false, url: '', title: '' })
    setSavedRange(null)
  }, [linkModal, savedRange, handleInput])

  const placeholder = getPlaceholder(composer.postType)

  return (
    <div className="space-y-0 relative">
      {/* ═══ TOOLBAR ═══ */}
      <div className={
        'flex items-center gap-0.5 px-3 py-2 rounded-t-xl border border-b-0 border-zinc-800 ' +
        'bg-zinc-950/80 overflow-x-auto scrollbar-hide flex-wrap'
      }>
        <ToolbarGroup>
          <ToolBtn Icon={TextT} label="Normal text" onClick={() => insertHeading('p')} />
          <ToolBtn Icon={TextHOne} label="Heading 1" onClick={() => insertHeading('h1')} />
          <ToolBtn Icon={TextHTwo} label="Heading 2" onClick={() => insertHeading('h2')} />
          <ToolBtn Icon={TextHThree} label="Heading 3" onClick={() => insertHeading('h3')} />
        </ToolbarGroup>
        <Divider />
        <ToolbarGroup>
          <ToolBtn Icon={TextB} label="Bold (Ctrl+B)" onClick={() => exec('bold')} />
          <ToolBtn Icon={TextItalic} label="Italic (Ctrl+I)" onClick={() => exec('italic')} />
          <ToolBtn Icon={TextUnderline} label="Underline (Ctrl+U)" onClick={() => exec('underline')} />
          <ToolBtn Icon={TextStrikethrough} label="Strikethrough" onClick={() => exec('strikeThrough')} />
        </ToolbarGroup>
        <Divider />
        {/* ✅ NEW: Alignment Controls */}
        <ToolbarGroup>
          <ToolBtn Icon={TextAlignLeft} label="Align left" onClick={() => exec('justifyLeft')} />
          <ToolBtn Icon={TextAlignCenter} label="Align center" onClick={() => exec('justifyCenter')} />
          <ToolBtn Icon={TextAlignRight} label="Align right" onClick={() => exec('justifyRight')} />
          <ToolBtn Icon={TextAlignJustify} label="Justify" onClick={() => exec('justifyFull')} />
        </ToolbarGroup>
        <Divider />
        <ToolbarGroup>
          <ToolBtn Icon={ListBullets} label="Bullet list" onClick={() => exec('insertUnorderedList')} />
          <ToolBtn Icon={ListNumbers} label="Numbered list" onClick={() => exec('insertOrderedList')} />
        </ToolbarGroup>
        <Divider />
        <ToolbarGroup>
          <ToolBtn Icon={Quotes} label="Quote" onClick={() => insertHeading('blockquote')} />
          <ToolBtn Icon={Code} label="Code" onClick={() => insertHeading('pre')} />
          <ToolBtn Icon={Minus} label="Divider" onClick={() => exec('insertHorizontalRule')} />
          <ToolBtn Icon={LinkSimple} label="Link (Ctrl+K)" onClick={openLinkModal} />
        </ToolbarGroup>
      </div>

      {/* ═══ TITLE (optional) ═══ */}
      {['article', 'milestone', 'launch', 'looking_for', 'discussion'].includes(composer.postType) && (
        <input
          type="text"
          value={composer.title}
          onChange={(e) => composer.setTitle(e.target.value)}
          placeholder="Add a title (optional)"
          maxLength={200}
          data-field="title"
          className="w-full bg-zinc-950/60 border border-b-0 border-zinc-800 px-5 py-4 text-[22px] md:text-[24px] font-bold text-white placeholder:text-zinc-600 focus:outline-none tracking-tight"
        />
      )}

      {/* ═══ EDITOR ═══ */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); exec('bold') }
          if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); exec('italic') }
          if ((e.metaKey || e.ctrlKey) && e.key === 'u') { e.preventDefault(); exec('underline') }
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openLinkModal() }
        }}
        data-placeholder={placeholder}
        className={
          'w-full min-h-[220px] max-h-[500px] overflow-y-auto ' +
          'px-5 py-5 ' +
          'border border-zinc-800 rounded-b-xl ' +
          'bg-zinc-950/40 ' +
          'text-[17px] md:text-[18px] text-zinc-100 leading-[1.6] ' +
          'focus:outline-none focus:border-zinc-700 transition-colors ' +
          'prose prose-invert prose-lg max-w-none ' +
          '[&_h1]:text-[28px] [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-3 [&_h1]:tracking-tight ' +
          '[&_h2]:text-[22px] [&_h2]:font-bold [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:tracking-tight ' +
          '[&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2 ' +
          '[&_blockquote]:border-l-4 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-5 [&_blockquote]:italic [&_blockquote]:text-zinc-400 [&_blockquote]:my-4 ' +
          '[&_pre]:bg-zinc-950 [&_pre]:border [&_pre]:border-zinc-800 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-[14px] [&_pre]:font-mono [&_pre]:text-emerald-400 [&_pre]:my-4 ' +
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul_li]:mb-1.5 ' +
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol_li]:mb-1.5 ' +
          '[&_a]:text-blue-400 [&_a]:underline ' +
          '[&_hr]:border-zinc-700 [&_hr]:my-5'
        }
      />

      {/* ═══ CUSTOM LINK MODAL ═══ */}
      {linkModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121214] border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <LinkIcon size={16} className="text-zinc-400" />
                <h3 className="text-[14px] font-bold text-white tracking-tight">Insert Link</h3>
              </div>
              <button onClick={() => setLinkModal({ open: false, url: '', title: '' })} className="text-zinc-500 hover:text-white transition-colors">
                <X size={16} weight="bold" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Link Title</label>
                <input
                  type="text"
                  value={linkModal.title}
                  onChange={(e) => setLinkModal({ ...linkModal, title: e.target.value })}
                  placeholder="e.g. My Startup Website"
                  autoFocus
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-[14px] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">URL</label>
                <input
                  type="text"
                  value={linkModal.url}
                  onChange={(e) => setLinkModal({ ...linkModal, url: e.target.value })}
                  placeholder="e.g. dsrtai.com"
                  onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2.5 text-[14px] text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="px-4 py-3 bg-zinc-900/30 border-t border-zinc-800/80 flex justify-end gap-2">
              <button
                onClick={() => setLinkModal({ open: false, url: '', title: '' })}
                className="px-4 py-2 text-[13px] font-semibold text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLink}
                disabled={!linkModal.url || !linkModal.title}
                className="px-5 py-2 rounded-lg bg-white text-black font-bold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
              >
                Insert Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getPlaceholder(type: string): string {
  const map: Record<string, string> = {
    update: "What's happening in DSRT?",
    idea: "Share an idea you've been thinking about...",
    build_log: 'What did you ship today? What did you learn?',
    milestone: 'What did you just achieve? Tell the community.',
    launch: 'What did you just launch? Drop the link.',
    looking_for: 'Who or what are you looking for? Be specific.',
    discussion: 'Start a discussion. Ask a question. Share an opinion.',
    poll: 'Ask your question here...',
    event: 'Describe the event...',
  }
  return map[type] || map.update
}

function ToolBtn({ Icon, label, onClick }: { Icon: any; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      title={label}
      className={
        'w-8 h-8 rounded-md flex items-center justify-center ' +
        'text-zinc-400 hover:text-white hover:bg-zinc-800/80 ' +
        'transition-colors'
      }
    >
      <Icon size={16} weight="regular" />
    </button>
  )
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>
}

function Divider() {
  return <div className="w-px h-5 bg-zinc-800/80 mx-2 shrink-0" />
}