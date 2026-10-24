'use client'

import { useState, useTransition } from 'react'
import { Image as ImageIcon, Link as LinkIcon, BarChart2, Send, X, Loader2, Plus } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useSignedUpload } from '@/hooks/useSignedUpload'
import { DsrtPanel, DsrtButton, DsrtTextarea, DsrtInput } from '@/components/dsrt'

interface Props {
  communityId: string
  slug: string
  currentUser?: { avatar_url?: string; full_name?: string }
  onPosted?: () => void
}

type Mode = 'text' | 'link' | 'poll'

export function PostComposer({ communityId, slug, currentUser, onPosted }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [mode, setMode] = useState<Mode>('text')
  const [body, setBody] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState<string[]>(['', ''])
  const [pollMultiple, setPollMultiple] = useState(false)
  const [pollAnonymous, setPollAnonymous] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ file_id: string; url: string }>>([])
  const [pending, startTransition] = useTransition()
  const { upload, uploading } = useSignedUpload()

  const reset = () => {
    setBody('')
    setLinkUrl('')
    setPollQuestion('')
    setPollOptions(['', ''])
    setPollMultiple(false)
    setPollAnonymous(false)
    setAttachments([])
    setMode('text')
    setExpanded(false)
  }

  const submit = () => {
    if (mode === 'text' && !body.trim() && attachments.length === 0) {
      toast.error('Write something')
      return
    }
    if (mode === 'link' && !linkUrl.trim()) {
      toast.error('Enter a link')
      return
    }
    if (mode === 'poll') {
      if (!pollQuestion.trim()) { toast.error('Poll question required'); return }
      if (pollOptions.filter((o) => o.trim()).length < 2) { toast.error('At least 2 options'); return }
    }

    const payload: any = {
      community_id: communityId,
      post_type: mode === 'link' ? 'LINK' : mode === 'poll' ? 'POLL' : 'TEXT',
      body: body.trim() || null,
      visibility: 'MEMBERS',
      attachments: attachments.length > 0 ? attachments.map((a) => ({ file_id: a.file_id, url: a.url, attachment_type: 'IMAGE' })) : undefined,
    }
    if (mode === 'link') payload.link_url = linkUrl.trim()
    if (mode === 'poll') {
      payload.poll = {
        question: pollQuestion.trim(),
        options: pollOptions.map((o) => o.trim()).filter(Boolean),
        multiple_choice: pollMultiple,
        anonymous: pollAnonymous,
        allow_change_vote: true,
      }
    }

    startTransition(async () => {
      const res = await fetch('/api/v1/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `post-${communityId}-${Date.now()}`,
        },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Post failed')
        return
      }
      toast.success('Posted')
      reset()
      onPosted?.()
    })
  }

  const handleImage = async (file: File) => {
    const result = await upload(file, {
      entity_type: 'community_post',
      entity_id: communityId,
      visibility: 'COMMUNITY',
    })
    if (result) {
      setAttachments((prev) => [...prev, { file_id: result.file_id, url: result.public_url }])
    }
  }

  const updateOption = (index: number, val: string) => {
    setPollOptions((prev) => {
      const next = [...prev]
      next[index] = val
      return next
    })
  }

  return (
    <DsrtPanel padding="md" className="mb-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-10 h-10 border border-white/[0.06] flex-shrink-0 mt-1">
          <AvatarImage src={currentUser?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[12px] bg-white/[0.06] text-white/80">
            {(currentUser?.full_name || '?').charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 space-y-4">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full text-left rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 text-[14px] font-medium text-white/50 transition-colors"
            >
              Share an update, ask a question, or start a poll…
            </button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-2 flex-wrap">
                <ModeButton k="text" active={mode} setActive={setMode} icon={ImageIcon} label="Post" />
                <ModeButton k="link" active={mode} setActive={setMode} icon={LinkIcon} label="Link" />
                <ModeButton k="poll" active={mode} setActive={setMode} icon={BarChart2} label="Poll" />
              </div>

              <DsrtTextarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={mode === 'poll' ? 'Optional context…' : 'What do you want to share?'}
                className="text-[14px] min-h-[100px]"
              />

              {mode === 'link' && (
                <DsrtInput
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://…"
                  sizeVariant="md"
                />
              )}

              {mode === 'poll' && (
                <div className="space-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <DsrtInput
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Poll question"
                  />
                  {pollOptions.map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <DsrtInput
                        value={o}
                        onChange={(e) => updateOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                      />
                      {pollOptions.length > 2 && (
                        <DsrtButton size="icon" variant="ghost" onClick={() => setPollOptions((prev) => prev.filter((_, idx) => idx !== i))}>
                          <X className="w-4 h-4" />
                        </DsrtButton>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 8 && (
                    <DsrtButton size="sm" variant="ghost" onClick={() => setPollOptions((prev) => [...prev, ''])} className="w-full border border-dashed border-white/[0.1] text-white/50">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add option
                    </DsrtButton>
                  )}
                  <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04]">
                    <label className="inline-flex items-center gap-2 text-[12px] text-white/70 cursor-pointer">
                      <input type="checkbox" checked={pollMultiple} onChange={(e) => setPollMultiple(e.target.checked)} className="rounded border-white/[0.2] bg-white/[0.05]" />
                      Multiple choice
                    </label>
                    <label className="inline-flex items-center gap-2 text-[12px] text-white/70 cursor-pointer">
                      <input type="checkbox" checked={pollAnonymous} onChange={(e) => setPollAnonymous(e.target.checked)} className="rounded border-white/[0.2] bg-white/[0.05]" />
                      Anonymous
                    </label>
                  </div>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {attachments.map((a, i) => (
                    <div key={a.file_id} className="relative w-24 h-24 rounded-lg border border-white/[0.08] overflow-hidden">
                      <img src={a.url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium text-white/70 hover:text-white transition-colors">
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5 mr-1" />}
                      {uploading ? 'Uploading...' : 'Add Image'}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleImage(f)
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <DsrtButton size="sm" variant="ghost" onClick={reset}>Cancel</DsrtButton>
                  <DsrtButton size="sm" variant="primary" onClick={submit} loading={pending}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Post
                  </DsrtButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DsrtPanel>
  )
}

function ModeButton({ k, active, setActive, icon: Icon, label }: any) {
  const isActive = active === k
  return (
    <button
      onClick={() => setActive(k)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        isActive ? 'bg-white/[0.1] text-white border border-white/[0.2]' : 'bg-transparent text-white/50 hover:bg-white/[0.05] hover:text-white border border-transparent'
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}