'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import {
  X, PaperPlaneTilt, MagnifyingGlass, CircleNotch,
  Buildings, FolderSimple, LinkSimple, TextB, TextItalic,
  ListBullets, Link as LinkIcon, Paperclip, Warning, Check,
  File as FileIcon, DownloadSimple
} from '@phosphor-icons/react'

interface Recipient {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  tagline: string | null
  is_verified: boolean
}

interface Attachment {
  url: string
  file_name: string
  file_size: number
  mime_type: string
}

interface Props {
  referenceType?: 'project' | 'venture' | null
  referenceId?: string | null
  referenceName?: string | null
  referenceSlug?: string | null
  recipientId?: string | null
  recipientName?: string | null
  prefillRecipient?: Recipient | null
  onClose: () => void
  onSent: () => void
}

function formatBytes(n: number): string {
  if (n < 1024) return n + ' B'
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
  return (n / 1024 / 1024).toFixed(1) + ' MB'
}

export function ComposeModal({
  referenceType, referenceId, referenceName, referenceSlug,
  recipientId, recipientName, prefillRecipient,
  onClose, onSent
}: Props) {
  const [recipient, setRecipient] = useState<Recipient | null>(prefillRecipient || null)
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientResults, setRecipientResults] = useState<Recipient[]>([])
  const [searchingRecipient, setSearchingRecipient] = useState(false)
  const [showRecipientSearch, setShowRecipientSearch] = useState(false)

  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasFixedRecipient = !!(referenceType && referenceId) || !!recipientId
  const isComposeMode = !hasFixedRecipient && !prefillRecipient

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!recipientQuery || recipientQuery.length < 2) { setRecipientResults([]); return }
    let cancelled = false
    setSearchingRecipient(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/inbox/recipients?q=' + encodeURIComponent(recipientQuery))
        const data = await res.json()
        if (!cancelled) setRecipientResults(data.recipients || [])
      } catch { /* ignore */ }
      finally { if (!cancelled) setSearchingRecipient(false) }
    }, 200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [recipientQuery])

  const selectRecipient = (r: Recipient) => {
    setRecipient(r)
    setRecipientQuery('')
    setRecipientResults([])
    setShowRecipientSearch(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 25 * 1024 * 1024) {
      setError('File too large (max 25MB)')
      return
    }
    if (attachments.length >= 5) {
      setError('Maximum 5 attachments')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/inbox/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setAttachments(prev => [...prev, {
        url: data.url,
        file_name: data.file_name,
        file_size: data.file_size,
        mime_type: data.mime_type,
      }])
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const canSend = (hasFixedRecipient || recipient) && subject.trim().length >= 3 && body.trim().length >= 1 && !sending && !uploading

  const send = async () => {
    if (!canSend) return
    setSending(true)
    setError(null)
    try {
      const payload: Record<string, any> = {
        subject: subject.trim(),
        body: body.trim(),
        media_urls: attachments.map(a => a.url),
      }
      if (referenceType && referenceId) {
        payload.reference_type = referenceType
        payload.reference_id = referenceId
      } else if (recipientId) {
        payload.recipient_id = recipientId
      } else if (recipient) {
        payload.recipient_id = recipient.id
      } else {
        throw new Error('No recipient selected')
      }

      const res = await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')

      // Upload attachments to thread if we have them
      if (attachments.length > 0 && json.thread?.id) {
        for (const att of attachments) {
          await fetch('/api/inbox/upload', {
            method: 'POST',
            body: (() => {
              const fd = new FormData()
              fd.append('thread_id', json.thread.id)
              fd.append('message_id', json.message?.id || '')
              return fd
            })(),
          }).catch(() => null)
        }
      }

      setSent(true)
      setTimeout(() => { onSent(); onClose() }, 1200)
    } catch (e: any) {
      setError(e?.message || 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const insertFormatting = (before: string, after: string = '') => {
    const ta = bodyRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = body.substring(start, end)
    const newBody = body.substring(0, start) + before + selected + after + body.substring(end)
    setBody(newBody)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + selected.length)
    }, 0)
  }

  if (sent) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl w-full max-w-md p-10 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Check size={22} weight="bold" className="text-emerald-400" />
          </div>
          <h3 className="text-[17px] font-bold text-white mb-1">Message sent</h3>
          <p className="text-[13px] text-white/50">Your message has been delivered.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl w-full max-w-[720px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h3 className="text-[16px] font-bold text-white">
              {isComposeMode ? 'New message' : 'Send a message'}
            </h3>
            <p className="text-[12px] text-white/50 mt-0.5">
              {isComposeMode ? 'Start a conversation with anyone on DSRT' : 'Send a professional reach-out'}
            </p>
          </div>
          <button onClick={onClose} disabled={sending} className="text-white/50 hover:text-white p-1 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {/* To field (compose mode) */}
        {isComposeMode && !recipient && (
          <div className="px-6 pt-4 shrink-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
              <span className="text-[12px] text-white/50 font-semibold min-w-[28px]">To</span>
              <div className="relative flex-1">
                <input
                  autoFocus
                  value={recipientQuery}
                  onChange={(e) => { setRecipientQuery(e.target.value); setShowRecipientSearch(true) }}
                  onFocus={() => setShowRecipientSearch(true)}
                  placeholder="Search by name or username..."
                  className="w-full bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
                />
                {showRecipientSearch && (recipientResults.length > 0 || searchingRecipient) && (
                  <div className="absolute top-full left-0 right-0 mt-2 max-h-56 overflow-y-auto rounded-lg border border-white/[0.1] bg-[#0f0f18] shadow-xl z-10">
                    {searchingRecipient && recipientResults.length === 0 ? (
                      <div className="px-3 py-2 text-[12px] text-white/50 flex items-center gap-2">
                        <CircleNotch size={11} className="animate-spin" /> Searching...
                      </div>
                    ) : recipientResults.map(r => (
                      <button key={r.id} onClick={() => selectRecipient(r)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.04]">
                        {r.avatar_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-white/[0.06] shrink-0 relative">
                            <Image src={r.avatar_url} alt="" fill className="object-cover" sizes="32px" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] font-bold text-white/60 shrink-0">
                            {r.full_name?.[0]?.toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <span className="text-[13px] font-semibold text-white truncate block">{r.full_name}</span>
                          <span className="text-[11px] text-white/50">@{r.username}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Selected recipient chip */}
        {isComposeMode && recipient && (
          <div className="px-6 pt-3 shrink-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
              <span className="text-[12px] text-white/50 font-semibold min-w-[28px]">To</span>
              <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1">
                <span className="text-[12.5px] font-semibold text-white/85">{recipient.full_name}</span>
                <button onClick={() => setRecipient(null)} className="text-white/40 hover:text-white"><X size={10} /></button>
              </div>
            </div>
          </div>
        )}

        {/* Reference chip */}
        {referenceName && (
          <div className="px-6 pt-3 flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">Regarding</span>
            <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1">
              {referenceType === 'venture' ? <Buildings size={12} className="text-white/60" /> : <FolderSimple size={12} className="text-white/60" />}
              <span className="text-[12px] font-semibold text-white/85">{referenceName}</span>
            </div>
          </div>
        )}

        {/* Non-compose recipient */}
        {!isComposeMode && recipientName && !referenceName && (
          <div className="px-6 pt-3 flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">To</span>
            <span className="text-[12px] font-semibold text-white/85">{recipientName}</span>
          </div>
        )}

        {/* Subject */}
        <div className="px-6 pt-3 shrink-0">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
            <span className="text-[12px] text-white/50 font-semibold min-w-[55px]">Subject</span>
            <input
              autoFocus={!isComposeMode}
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              placeholder="What is this about?"
              className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
            />
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 pt-2 flex items-center gap-0.5 shrink-0">
          <ToolBtn onClick={() => insertFormatting('**', '**')} label="Bold"><TextB size={14} weight="bold" /></ToolBtn>
          <ToolBtn onClick={() => insertFormatting('*', '*')} label="Italic"><TextItalic size={14} /></ToolBtn>
          <ToolBtn onClick={() => insertFormatting('\n- ')} label="List"><ListBullets size={14} /></ToolBtn>
          <ToolBtn onClick={() => {
            const url = window.prompt('Enter URL:', 'https://')
            if (url) insertFormatting('[', '](' + url + ')')
          }} label="Link"><LinkIcon size={14} /></ToolBtn>
          <div className="w-px h-4 bg-white/[0.1] mx-1" />
          <ToolBtn onClick={() => fileInputRef.current?.click()} label="Attach file">
            {uploading ? <CircleNotch size={14} className="animate-spin" /> : <Paperclip size={14} />}
          </ToolBtn>
          <input ref={fileInputRef} type="file" hidden onChange={handleFileUpload} />
          <div className="flex-1" />
          <span className="text-[10px] text-white/30">{body.length} / 10,000</span>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="px-6 pt-2 flex flex-wrap gap-2 shrink-0">
            {attachments.map((att, i) => (
              <div key={i} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 max-w-[240px]">
                <FileIcon size={12} className="text-white/50 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-white/80 truncate">{att.file_name}</p>
                  <p className="text-[9px] text-white/40">{formatBytes(att.file_size)}</p>
                </div>
                <button onClick={() => removeAttachment(i)} className="text-white/40 hover:text-white shrink-0">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="px-6 pt-1 pb-3 flex-1 overflow-hidden">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 10000))}
            placeholder="Write your message..."
            className="w-full h-full min-h-[200px] bg-transparent text-[14px] text-white/90 placeholder:text-white/30 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 pb-2 shrink-0">
            <div className="flex items-start gap-2 p-2.5 rounded-md border border-red-500/30 bg-red-500/5 text-[12px] text-red-400">
              <Warning size={12} weight="fill" className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[10.5px] text-white/40 hidden sm:block max-w-[280px] leading-snug">
            {attachments.length > 0 ? `${attachments.length} attachment${attachments.length !== 1 ? 's' : ''}` : 'Your message will appear in their inbox.'}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={sending}
              className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md disabled:opacity-50">
              Cancel
            </button>
            <button onClick={send} disabled={!canSend}
              className="px-5 h-9 text-[13px] font-bold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40 flex items-center gap-1.5">
              {sending ? (
                <><CircleNotch size={12} className="animate-spin" /> Sending</>
              ) : (
                <><PaperPlaneTilt size={12} weight="fill" /> Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ToolBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} title={label} aria-label={label}
      className="w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]">
      {children}
    </button>
  )
}
