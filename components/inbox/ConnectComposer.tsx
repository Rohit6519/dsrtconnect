'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, PaperPlaneRight, Buildings, FolderSimple, LinkSimple,
  TextB, TextItalic, ListBullets, Link as LinkIcon, Paperclip, File as FileIcon
} from '@phosphor-icons/react'
import { toast } from 'sonner'

interface Props {
  referenceType?: 'project' | 'venture' | null
  referenceId?: string | null
  referenceName?: string | null
  referenceSlug?: string | null
  recipientId?: string | null
  recipientName?: string | null
  onClose: () => void
  onSent: () => void
}

interface Attachment {
  url: string
  name: string
  size: number
  type: string
}

export function ConnectComposer({
  referenceType, referenceId, referenceName, referenceSlug,
  recipientId, recipientName,
  onClose, onSent
}: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const canSend = subject.trim().length >= 3 && body.trim().length >= 10 && !sending

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (attachments.length + files.length > 5) {
      toast.error('Maximum 5 attachments')
      return
    }
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/inbox/upload', { method: 'POST', body: fd })
        const json = await res.json()
        if (!res.ok) { toast.error(json.error || 'Upload failed'); continue }
        setAttachments(prev => [...prev, json])
      }
    } catch { toast.error('Upload failed') }
    finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      const payload: Record<string, any> = {
        subject: subject.trim(),
        body: body.trim(),
        attachments,
      }

      if (referenceType && referenceId) {
        payload.reference_type = referenceType
        payload.reference_id = referenceId
      } else if (recipientId) {
        payload.recipient_id = recipientId
      }

      const res = await fetch('/api/inbox/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to send')

      toast.success('Message sent')
      onSent()
      onClose()
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send')
    } finally { setSending(false) }
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

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const ReferenceIcon = referenceType === 'venture' ? Buildings : FolderSimple

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.1] rounded-2xl w-full max-w-[720px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div>
            <h3 className="text-[16px] font-semibold text-white">New message</h3>
            <p className="text-[12px] text-white/50 mt-0.5">Send a professional reach-out</p>
          </div>
          <button onClick={onClose} disabled={sending} className="text-white/50 hover:text-white p-1 disabled:opacity-50">
            <X size={20} />
          </button>
        </div>

        {(referenceName || recipientName) && (
          <div className="px-6 pt-3 flex items-center gap-2 flex-shrink-0">
            <span className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">Regarding:</span>
            <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.1] rounded-lg px-2.5 py-1">
              {referenceType && <ReferenceIcon size={12} className="text-white/60" />}
              <span className="text-[12px] font-semibold text-white/85">
                {referenceName || recipientName}
              </span>
              {referenceSlug && (
                <a
                  href={'/' + (referenceType === 'venture' ? 'ventures' : 'projects') + '/' + referenceSlug}
                  target="_blank" rel="noopener noreferrer"
                  className="text-white/40 hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkSimple size={10} />
                </a>
              )}
            </div>
          </div>
        )}

        <div className="px-6 pt-3 flex-shrink-0">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
            <span className="text-[12px] text-white/50 font-semibold min-w-[60px]">Subject</span>
            <input
              autoFocus
              value={subject}
              onChange={(e) => setSubject(e.target.value.slice(0, 200))}
              placeholder="What is this about?"
              className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/30 outline-none"
            />
          </div>
        </div>

        <div className="px-6 pt-2 flex items-center gap-0.5 flex-shrink-0">
          <button type="button" onClick={() => insertFormatting('**', '**')}
            className="w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]" title="Bold">
            <TextB size={14} weight="bold" />
          </button>
          <button type="button" onClick={() => insertFormatting('*', '*')}
            className="w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]" title="Italic">
            <TextItalic size={14} />
          </button>
          <button type="button" onClick={() => insertFormatting('\n- ')}
            className="w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]" title="List">
            <ListBullets size={14} />
          </button>
          <button type="button" onClick={() => {
            const url = window.prompt('Enter URL:', 'https://')
            if (url) insertFormatting('[', '](' + url + ')')
          }} className="w-7 h-7 rounded flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.06]" title="Link">
            <LinkIcon size={14} />
          </button>
          <div className="flex-1" />
          <span className="text-[10px] text-white/30">{body.length} / 5000</span>
        </div>

        <div className="px-6 pt-1 pb-3 flex-1 overflow-hidden">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            placeholder="Write your message. Be clear, professional, and specific about what you're looking for or offering..."
            className="w-full h-full min-h-[220px] bg-transparent text-[14px] text-white/90 placeholder:text-white/30 outline-none resize-none leading-relaxed"
          />
        </div>

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-6 pb-3 flex-shrink-0">
            <p className="text-[10px] text-white/45 uppercase tracking-wider font-semibold mb-2">
              {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1.5">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-white/[0.03] border border-white/[0.06]">
                  <FileIcon size={12} className="text-white/50 flex-shrink-0" />
                  <span className="text-[11.5px] text-white/85 truncate flex-1">{att.name}</span>
                  <span className="text-[10px] text-white/45">{fmtSize(att.size)}</span>
                  <button onClick={() => removeAttachment(i)} className="text-white/40 hover:text-red-400 flex-shrink-0">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-white/[0.06] px-6 py-3 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || attachments.length >= 5}
              className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center disabled:opacity-40"
              title="Attach files"
            >
              <Paperclip size={13} />
            </button>
            {uploading && <span className="text-[10.5px] text-white/50">Uploading...</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} disabled={sending}
              className="px-4 h-9 text-[13px] text-white/70 hover:text-white border border-white/[0.1] rounded-md disabled:opacity-50">
              Cancel
            </button>
            <button onClick={send} disabled={!canSend}
              className="px-5 h-9 text-[13px] font-semibold bg-white text-black hover:bg-white/90 rounded-md disabled:opacity-40 flex items-center gap-1.5">
              {sending ? (
                <><div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" /> Sending</>
              ) : (
                <><PaperPlaneRight size={12} weight="fill" /> Send</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}