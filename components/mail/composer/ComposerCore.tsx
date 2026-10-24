// filepath: components/mail/composer/ComposerCore.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  X, ArrowsOut, ArrowsIn, Paperclip, ImageSquare,
  Buildings, RocketLaunch, TrashSimple, Sparkle, Minus, CaretLeft
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useComposer, ComposeInitialState } from './ComposerContext'
import { useMailIdentity } from '../hooks/useMailIdentity'
import { FromIdentityPicker } from './FromIdentityPicker'
import { RecipientField } from './RecipientField'
import { RichEditor } from './RichEditor'
import { AttachmentPanel } from './AttachmentPanel'
import { EntityAttachPicker } from './EntityAttachPicker'
import { SendButton } from './SendButton'
import { useDraftAutosave } from '../hooks/useDraftAutosave'
import { useDraftPresence } from '../hooks/useDraftPresence'
import { mailToast } from '@/lib/mail/toastBus'
import { emitMailRefresh } from '@/lib/mail/mailEvents'

interface Props {
  mode: 'quick' | 'full'
  initialState: ComposeInitialState | null
}

export function ComposerCore({ mode, initialState }: Props) {
  const { closeCompose, toggleFullscreen, isFullscreen } = useComposer()
  const { identities, activeIdentity, isUnified } = useMailIdentity()

  const activeIdString =
    typeof activeIdentity === 'object' && activeIdentity !== null
      ? activeIdentity.identity_id
      : null

  const defaultFromId =
    initialState?.from_identity_id ||
    (!isUnified ? activeIdString : null) ||
    identities.find((i) => i.entity_type === 'user')?.identity_id ||
    identities[0]?.identity_id ||
    null

  const [fromIdentityId, setFromIdentityId] = useState<string | null>(defaultFromId)
  const [to, setTo] = useState<any[]>(initialState?.to || [])
  const [cc, setCc] = useState<any[]>(initialState?.cc || [])
  const [bcc, setBcc] = useState<any[]>(initialState?.bcc || [])
  const [showCc, setShowCc] = useState(
    (initialState?.cc?.length || 0) > 0 || (initialState?.bcc?.length || 0) > 0
  )
  const [subject, setSubject] = useState(initialState?.subject || '')
  const [bodyHtml, setBodyHtml] = useState(initialState?.body_html || '')
  const [attachments, setAttachments] = useState<any[]>(initialState?.attachments || [])
  const [entityAttachments, setEntityAttachments] = useState<any[]>(
    initialState?.entity_attachments || []
  )
  const [sending, setSending] = useState(false)
  const [draftId, setDraftId] = useState<string | null>((initialState as any)?.draft_id || null)
  const [entityPickerType, setEntityPickerType] = useState<'venture' | 'project' | null>(null)
  const [minimized, setMinimized] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!fromIdentityId && defaultFromId) setFromIdentityId(defaultFromId)
  }, [defaultFromId, fromIdentityId])

  // ============================================================
  // COCO INTEGRATION — listen for programmatic fill events
  // COCO tools dispatch these events; the composer state responds.
  // Selectors on DOM elements are also present as a fallback.
  // ============================================================
  useEffect(() => {
    const handleCocoFillRecipient = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.recipient) return
      // Build a simple recipient object shape used by RecipientField
      const raw = String(detail.recipient).trim()
      const cleaned = raw.replace(/^@/, '')
      setTo((prev) => {
        const exists = prev.some((r: any) =>
          (r?.email && r.email === cleaned) ||
          (r?.username && r.username === cleaned) ||
          (r?.handle && r.handle === cleaned)
        )
        if (exists) return prev
        const entry = cleaned.includes('@')
          ? { email: cleaned, label: cleaned }
          : { username: cleaned, handle: cleaned, label: `@${cleaned}` }
        return [...prev, entry]
      })
    }

    const handleCocoFillSubject = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.subject === 'string') setSubject(detail.subject)
    }

    const handleCocoFillBody = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.body === 'string') {
        // Accept plain text or HTML
        const html = detail.body.includes('<')
          ? detail.body
          : detail.body
              .split('\n')
              .map((line: string) => `<p>${escapeHtml(line)}</p>`)
              .join('')
        setBodyHtml(html)
      }
    }

    window.addEventListener('coco:mail:fill-recipient', handleCocoFillRecipient as EventListener)
    window.addEventListener('coco:mail:fill-subject', handleCocoFillSubject as EventListener)
    window.addEventListener('coco:mail:fill-body', handleCocoFillBody as EventListener)

    return () => {
      window.removeEventListener('coco:mail:fill-recipient', handleCocoFillRecipient as EventListener)
      window.removeEventListener('coco:mail:fill-subject', handleCocoFillSubject as EventListener)
      window.removeEventListener('coco:mail:fill-body', handleCocoFillBody as EventListener)
    }
  }, [])

  const isDirty =
    !!subject || !!bodyHtml || to.length > 0 || cc.length > 0 || bcc.length > 0 ||
    attachments.length > 0 || entityAttachments.length > 0

  const buildPayload = useCallback(
    () => ({
      from_identity_id: fromIdentityId,
      to, cc, bcc, subject, body_html: bodyHtml, attachments,
      entity_attachments: entityAttachments,
      reply_to_thread_id: initialState?.reply_to_thread_id,
      reply_to_message_id: initialState?.reply_to_message_id,
      compose_mode: initialState?.mode || 'new',
    }),
    [fromIdentityId, to, cc, bcc, subject, bodyHtml, attachments, entityAttachments, initialState]
  )

  const { saving: savingDraft, lastSaved, conflict, saveNow, acknowledgeConflictAndTakeOver } = useDraftAutosave({
    draftId, setDraftId, enabled: !!fromIdentityId && !sending, buildPayload, isDirty,
  })

  const { foreignEditor } = useDraftPresence(draftId, true)

  const isUploading = attachments.some((a) => a.uploading)
  const canSend = !!fromIdentityId && to.length > 0 && subject.trim().length > 0 &&
    bodyHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0 && !isUploading

  const handleSend = async (scheduledSendAt?: Date) => {
    if (!canSend) {
      if (!fromIdentityId) mailToast.error('Please select a sender identity')
      else if (to.length === 0) mailToast.error('Please add at least one recipient')
      else if (!subject.trim()) mailToast.error('Please add a subject')
      else if (!bodyHtml.replace(/<[^>]*>/g, '').trim()) mailToast.error('Please write a message')
      else if (isUploading) mailToast.error('Waiting for uploads to finish')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_identity_id: fromIdentityId, to, cc, bcc,
          subject: subject.trim(), body_html: bodyHtml, attachments,
          entity_attachments: entityAttachments,
          source_type: initialState?.source_type || 'direct',
          source_entity_type: initialState?.source_entity_type,
          source_entity_id: initialState?.source_entity_id,
          reply_to_thread_id: initialState?.reply_to_thread_id,
          reply_to_message_id: initialState?.reply_to_message_id,
          draft_id: draftId,
          scheduled_send_at: scheduledSendAt?.toISOString() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')

      if (scheduledSendAt) mailToast.success('Message scheduled', `Will send on ${scheduledSendAt.toLocaleString()}`)
      else mailToast.success('Message sent', `Delivered to ${data.recipient_count || to.length} recipient(s)`)

      closeCompose()
      emitMailRefresh()
    } catch (e: any) {
      mailToast.error(e.message || 'Failed to send')
      setSending(false)
    }
  }

  const handleDiscard = async () => {
    if (draftId) {
      await fetch(`/api/mail/drafts/${draftId}`, { method: 'DELETE' })
      mailToast.success('Draft discarded')
      emitMailRefresh()
    }
    closeCompose()
  }

  const handleFilesUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const filesArr = Array.from(files)
    const MAX_SIZE = 25 * 1024 * 1024
    const oversized = filesArr.filter((f) => f.size > MAX_SIZE)
    if (oversized.length > 0) {
      mailToast.error(`Files over 25MB are not allowed: ${oversized.map((f) => f.name).join(', ')}`)
      return
    }
    if (attachments.length + filesArr.length > 15) {
      mailToast.error('Maximum 15 attachments per message')
      return
    }

    const placeholders = filesArr.map((f) => ({
      url: '', name: f.name, size: f.size, type: f.type, uploading: true, uploadProgress: 0,
    }))
    let newList = [...attachments, ...placeholders]
    setAttachments(newList)

    for (const file of filesArr) {
      const fd = new FormData()
      fd.append('file', file)
      try {
        const res = await fetch('/api/mail/attachments/upload', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        newList = newList.map((a) =>
          a.uploading && a.name === file.name && a.size === file.size
            ? { ...a, url: data.url, name: data.name, path: data.path, uploading: false } : a
        )
        setAttachments(newList)
      } catch (err: any) {
        mailToast.error(`${file.name}: ${err.message || 'Upload failed'}`)
        newList = newList.filter((a) => !(a.uploading && a.name === file.name))
        setAttachments(newList)
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Desktop Minimized State
  if (minimized && !isFullscreen) {
    return (
      <div className="w-full h-11 bg-[#141419] border-t border-white/[0.1] shadow-2xl flex items-center overflow-hidden rounded-t-xl">
        <button
          onClick={() => setMinimized(false)}
          className="flex-1 flex items-center gap-2 px-4 h-full hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="w-2 h-2 rounded-full bg-white/70" />
          <p className="text-[12.5px] font-bold text-white truncate">
            {subject || 'New message'}
          </p>
        </button>
        <button
          onClick={() => setMinimized(false)}
          className="w-10 h-full hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center"
        >
          <ArrowsOut className="w-4 h-4" weight="bold" />
        </button>
        <button
          onClick={closeCompose}
          className="w-10 h-full hover:bg-red-500/20 text-white/60 hover:text-red-400 flex items-center justify-center"
        >
          <X className="w-4 h-4" weight="bold" />
        </button>
      </div>
    )
  }

  return (
    <div
      data-coco-mail-composer-root
      className="flex flex-col w-full h-full bg-gradient-to-b from-[#0B0D14] to-[#08090F] overflow-hidden"
    >
      {/* ─── HEADER ─── */}
      <div className="h-14 sm:h-12 px-3 sm:px-4 flex items-center justify-between bg-white/[0.02] border-b border-white/[0.06] flex-shrink-0">
        <div className="flex items-center sm:hidden">
          <button
            onClick={closeCompose}
            className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white/70 hover:bg-white/[0.06] hover:text-white"
          >
            <CaretLeft className="w-6 h-6" weight="bold" />
          </button>
        </div>

        <div className="flex flex-col justify-center min-w-0 flex-1 sm:flex-none">
          <p className="text-[14px] sm:text-[13px] font-bold text-white tracking-tight truncate px-2 sm:px-0">
            {initialState?.mode === 'reply' ? 'Reply' : initialState?.mode === 'reply_all' ? 'Reply all' : initialState?.mode === 'forward' ? 'Forward' : 'New Message'}
          </p>
          <div className="flex items-center px-2 sm:px-0">
            {savingDraft ? (
              <span className="text-[10px] font-mono text-white/40">Saving...</span>
            ) : lastSaved ? (
              <span className="text-[10px] font-mono text-white/40">Saved {lastSaved.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            ) : null}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => setMinimized(true)}
            className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4" weight="bold" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-md hover:bg-white/[0.06] text-white/50 hover:text-white flex items-center justify-center transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <ArrowsIn className="w-4 h-4" weight="bold" /> : <ArrowsOut className="w-4 h-4" weight="bold" />}
          </button>
          <button
            onClick={closeCompose}
            className="w-8 h-8 rounded-md hover:bg-red-500/15 text-white/50 hover:text-red-400 flex items-center justify-center transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" weight="bold" />
          </button>
        </div>
      </div>

      {/* ─── MULTI-TAB WARNING ─── */}
      {(conflict || foreignEditor) && (
        <div className="px-4 py-2.5 border-b border-white/[0.06] bg-amber-500/10 flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11.5px] text-amber-200 leading-tight">
            {conflict ? 'Draft updated elsewhere. Saving paused.' : 'Draft open in another tab.'}
          </p>
          {conflict && (
            <button
              onClick={() => { acknowledgeConflictAndTakeOver(); void saveNow(); }}
              className="h-7 px-3 rounded-md text-[11px] font-bold bg-amber-400 text-black hover:bg-amber-300 shrink-0"
            >
              Take over
            </button>
          )}
        </div>
      )}

      {/* ─── FORM FIELDS ─── */}
      <div className="overflow-y-auto flex-1 flex flex-col min-h-0 bg-[#0B0D14]">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <span className="text-[11.5px] font-bold text-white/40 uppercase tracking-widest w-10 shrink-0">From</span>
            <div className="flex-1 min-w-0">
              <FromIdentityPicker value={fromIdentityId} onChange={setFromIdentityId} />
            </div>
          </div>
        </div>

        {/* COCO hook: recipient — wraps RecipientField so DOM queries can find it */}
        <div data-coco-mail-to>
          <RecipientField label="To" value={to} onChange={setTo} autoFocus={to.length === 0} />
        </div>

        {showCc && (
          <>
            <div data-coco-mail-cc>
              <RecipientField label="Cc" value={cc} onChange={setCc} />
            </div>
            <div data-coco-mail-bcc>
              <RecipientField label="Bcc" value={bcc} onChange={setBcc} />
            </div>
          </>
        )}

        {!showCc && (
          <div className="px-4 py-2 border-b border-white/[0.06] flex items-center">
            <div className="w-10 shrink-0" />
            <button
              onClick={() => setShowCc(true)}
              className="text-[11px] font-bold text-white/40 hover:text-white uppercase tracking-wider transition-colors"
            >
              Add Cc / Bcc
            </button>
          </div>
        )}

        <div className="px-4 border-b border-white/[0.06] flex items-center gap-3">
          <input
            data-coco-mail-subject
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 h-12 bg-transparent text-[15px] font-semibold text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>

        {/* COCO hook: body wrapper. RichEditor internals also expose their contenteditable via [data-coco-mail-body-target] if you add it there. */}
        <div data-coco-mail-body className="flex-1 flex flex-col min-h-[300px]">
          <RichEditor value={bodyHtml} onChange={setBodyHtml} />
        </div>

        {entityAttachments.length > 0 && (
          <div className="border-t border-white/[0.06] px-4 py-3 bg-[#08090F] shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {entityAttachments.map((ea, i) => {
                const EIcon = ea.type === 'venture' ? Buildings : RocketLaunch
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0 overflow-hidden">
                      {ea.logo_url ? <img src={ea.logo_url} alt="" className="w-full h-full object-cover" /> : <EIcon className="w-4 h-4 text-white/60" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{ea.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">{ea.type}</p>
                    </div>
                    <button
                      onClick={() => setEntityAttachments(entityAttachments.filter((_, idx) => idx !== i))}
                      className="w-8 h-8 rounded-full hover:bg-white/[0.08] text-white/40 hover:text-red-400 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" weight="bold" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <AttachmentPanel attachments={attachments} onChange={setAttachments} />
      </div>

      <input ref={fileInputRef} type="file" multiple hidden onChange={(e) => handleFilesUpload(e.target.files)} />

      {/* ─── FOOTER TOOLBAR ─── */}
      <div className="h-[60px] sm:h-[64px] px-2 sm:px-4 flex items-center justify-between border-t border-white/[0.06] bg-[#0A0C13] shrink-0">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pr-2">
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center shrink-0">
            <Paperclip className="w-5 h-5" />
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center shrink-0">
            <ImageSquare className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-white/[0.1] mx-1 shrink-0" />
          <button onClick={() => setEntityPickerType('venture')} className="w-10 h-10 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-[#93c5fd] flex items-center justify-center shrink-0">
            <Buildings className="w-5 h-5" />
          </button>
          <button onClick={() => setEntityPickerType('project')} className="w-10 h-10 rounded-full hover:bg-white/[0.06] text-white/60 hover:text-[#34d399] flex items-center justify-center shrink-0">
            <RocketLaunch className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-white/[0.1] mx-1 shrink-0" />
          <button className="w-10 h-10 rounded-full hover:bg-[#8b5cf6]/20 text-white/60 hover:text-[#a78bfa] flex items-center justify-center shrink-0">
            <Sparkle className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-white/[0.06]">
          <button
            onClick={handleDiscard}
            className="w-10 h-10 rounded-full hover:bg-red-500/15 text-white/50 hover:text-red-400 flex items-center justify-center transition-colors"
            title="Discard"
          >
            <TrashSimple className="w-[18px] h-[18px]" />
          </button>
          <SendButton
            onSend={() => handleSend()}
            onSchedule={(date) => handleSend(date)}
            sending={sending}
            disabled={!canSend}
          />
        </div>
      </div>

      {entityPickerType && (
        <EntityAttachPicker
          type={entityPickerType}
          onClose={() => setEntityPickerType(null)}
          onAttach={(ea) => {
            setEntityAttachments([...entityAttachments, ea])
            setEntityPickerType(null)
          }}
        />
      )}
    </div>
  )
}

// ------------------------------------------------------------
// Utility
// ------------------------------------------------------------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}