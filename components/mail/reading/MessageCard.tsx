'use client'

import { useMemo, useState } from 'react'
import {
  ArrowBendDoubleUpLeft,
  ArrowBendUpLeft,
  ArrowBendUpRight,
  CaretDown,
  CaretUp,
  Paperclip,
  User,
  ShieldWarning,
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { MessageDetailsPopover, RecipientPersona } from './MessageDetailsPopover'

interface MessageCardProps {
  message: any
  isFirst?: boolean
  isLast?: boolean
  onReply?: () => void
  onReplyAll?: () => void
  onForward?: () => void
  currentUserEmail?: string
}

function formatDateTime(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getInitials(name?: string) {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function MessageCard({
  message,
  isFirst = false,
  isLast = false,
  onReply,
  onReplyAll,
  onForward,
  currentUserEmail,
}: MessageCardProps) {
  const [expanded, setExpanded] = useState(Boolean(isLast || isFirst))

  const sender = message?.sender_identity || null
  const senderName = sender?.display_name || sender?.dsrt_email || 'Unknown'
  const senderEmail = sender?.dsrt_email || ''
  const sentAt = formatDateTime(message?.sent_at || message?.created_at)
  const attachments = Array.isArray(message?.attachments) ? message.attachments : []

  const bodyHtml = message?.body_html || ''
  const bodyText = message?.body_text || ''

  // Dynamic recipients from API
  const toRecipients: RecipientPersona[] = (message?.to_recipients || []).map((r: any) => ({
    display_name: r?.display_name,
    dsrt_email: r?.dsrt_email,
  }))
  const ccRecipients: RecipientPersona[] = (message?.cc_recipients || []).map((r: any) => ({
    display_name: r?.display_name,
    dsrt_email: r?.dsrt_email,
  }))

  const isSentByMe = Boolean(message?.is_sent_by_me)
  const securityResult = message?.security_result || null

  const preview = useMemo(() => {
    const raw = (bodyText || bodyHtml.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
    return raw.length > 140 ? `${raw.slice(0, 140)}…` : raw
  }, [bodyHtml, bodyText])

  const isPhishingOrMalware =
    securityResult?.classification === 'PHISHING' ||
    securityResult?.classification === 'MALWARE'

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-[#0a0a0f]/80 overflow-visible',
        !isLast && 'mb-3'
      )}
    >
      <div
        className="w-full px-4 py-3 flex items-start gap-3 text-left cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-9 h-9 rounded-full overflow-hidden bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
          {sender?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={sender.avatar_url}
              alt={senderName}
              className="w-full h-full object-cover"
            />
          ) : senderName ? (
            <span className="text-[11px] font-bold text-white/80">
              {getInitials(senderName)}
            </span>
          ) : (
            <User className="w-4 h-4 text-white/50" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[13px] font-semibold text-white truncate">
                  {senderName}
                </p>
                {senderEmail && (
                  <p className="text-[11px] text-white/45 truncate">
                    &lt;{senderEmail}&gt;
                  </p>
                )}
              </div>
              {expanded && (
                <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <MessageDetailsPopover
                    fromName={senderName}
                    fromEmail={senderEmail}
                    toRecipients={toRecipients}
                    ccRecipients={ccRecipients}
                    date={message?.sent_at || message?.created_at}
                    subject={message?.subject}
                    isSentByMe={isSentByMe}
                    myEmail={currentUserEmail}
                    securityInfo={
                      securityResult
                        ? {
                            spf: securityResult.spf_result,
                            dkim: securityResult.dkim_result,
                            dmarc: securityResult.dmarc_result,
                            tls: securityResult.tls_result,
                          }
                        : undefined
                    }
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {attachments.length > 0 && (
                <Paperclip className="w-3.5 h-3.5 text-white/40" />
              )}
              <span className="text-[11px] text-white/45">{sentAt}</span>
              {expanded ? (
                <CaretUp className="w-3.5 h-3.5 text-white/40" />
              ) : (
                <CaretDown className="w-3.5 h-3.5 text-white/40" />
              )}
            </div>
          </div>

          {!expanded && preview && (
            <p className="mt-1 text-[12px] text-white/50 truncate">{preview}</p>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="pl-12 space-y-3">
            {isPhishingOrMalware && (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/[0.06] flex items-start gap-2.5 text-[12px]">
                <ShieldWarning
                  className="w-4 h-4 text-red-400 shrink-0 mt-0.5"
                  weight="fill"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-red-200">
                    Security Warning: {securityResult.classification}
                  </p>
                  <p className="text-white/60 mt-0.5">
                    This message was flagged by DSRT Security (
                    {securityResult.decision_reason_code || 'Suspicious Content'}). Be
                    careful clicking links or downloading attachments.
                  </p>
                </div>
              </div>
            )}

            {bodyHtml ? (
              <div
                className="prose prose-invert max-w-none text-[13.5px] leading-relaxed text-white/85
                  prose-p:my-2 prose-a:text-blue-300 prose-strong:text-white
                  prose-blockquote:border-white/20 prose-blockquote:text-white/60"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : (
              <p className="text-[13.5px] leading-relaxed text-white/85 whitespace-pre-wrap">
                {bodyText || '(empty message)'}
              </p>
            )}

            {attachments.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {attachments.map((file: any, idx: number) => {
                  const name = file?.name || file?.file_name || `Attachment ${idx + 1}`
                  const url = file?.url || file?.file_url
                  return (
                    <a
                      key={`${name}-${idx}`}
                      href={url || '#'}
                      target={url ? '_blank' : undefined}
                      rel={url ? 'noreferrer' : undefined}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-white/[0.1] bg-white/[0.03] text-[11.5px] text-white/75 hover:bg-white/[0.06]"
                      onClick={(e) => {
                        if (!url) e.preventDefault()
                      }}
                    >
                      <Paperclip className="w-3 h-3" />
                      <span className="truncate max-w-[180px]">{name}</span>
                    </a>
                  )
                })}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={onReply}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/[0.12] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06]"
              >
                <ArrowBendUpLeft className="w-3.5 h-3.5" />
                Reply
              </button>
              <button
                type="button"
                onClick={onReplyAll}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/[0.12] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06]"
              >
                <ArrowBendDoubleUpLeft className="w-3.5 h-3.5" />
                Reply all
              </button>
              <button
                type="button"
                onClick={onForward}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-white/[0.12] text-[12px] text-white/75 hover:text-white hover:bg-white/[0.06]"
              >
                <ArrowBendUpRight className="w-3.5 h-3.5" />
                Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MessageCard