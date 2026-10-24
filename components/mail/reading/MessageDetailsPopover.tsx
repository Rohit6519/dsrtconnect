'use client'

import { useState, useRef, useEffect } from 'react'
import { CaretDown, ShieldCheck, EnvelopeSimple } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

export interface RecipientPersona {
  display_name?: string
  dsrt_email?: string
}

interface Props {
  fromName: string
  fromEmail: string
  toRecipients: RecipientPersona[]
  ccRecipients?: RecipientPersona[]
  replyToEmail?: string
  date?: string
  subject?: string
  isSentByMe: boolean
  myEmail?: string
  securityInfo?: {
    spf?: string
    dkim?: string
    dmarc?: string
    tls?: boolean
  }
}

export function MessageDetailsPopover({
  fromName,
  fromEmail,
  toRecipients,
  ccRecipients = [],
  replyToEmail,
  date,
  subject,
  isSentByMe,
  myEmail,
  securityInfo,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const formattedDate = date
    ? new Date(date).toLocaleString([], {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''

  const encryptionOK = securityInfo?.tls !== false

  // Determine the compact "to X" label
  const toLabel = (() => {
    if (toRecipients.length === 0) return 'to me'

    const myLower = (myEmail || '').toLowerCase()
    const isOnlyToMe =
      toRecipients.length === 1 &&
      toRecipients[0]?.dsrt_email?.toLowerCase() === myLower

    if (isOnlyToMe) return 'to me'

    if (toRecipients.length === 1) {
      const r = toRecipients[0]
      const shortName =
        r.display_name?.split(' ')[0] ||
        r.dsrt_email?.split('@')[0] ||
        'recipient'
      return `to ${shortName}`
    }

    const first = toRecipients[0]
    const firstShort =
      first?.display_name?.split(' ')[0] ||
      first?.dsrt_email?.split('@')[0] ||
      'recipient'
    return `to ${firstShort}, +${toRecipients.length - 1}`
  })()

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className={cn(
          'inline-flex items-center gap-1 text-[11px] font-medium',
          'text-white/50 hover:text-white/80 transition-colors'
        )}
      >
        {toLabel}
        <CaretDown className="w-2.5 h-2.5" weight="bold" />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 top-full mt-1.5 z-[80] w-[460px] max-w-[95vw]',
            'rounded-xl overflow-hidden shadow-2xl',
            'bg-gradient-to-b from-[#141419] to-[#0a0a0f]',
            'border border-white/[0.1]'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2.5 border-b border-white/[0.06] flex items-center gap-2 bg-white/[0.02]">
            <EnvelopeSimple className="w-3.5 h-3.5 text-white/60" weight="bold" />
            <p className="text-[11.5px] font-bold uppercase tracking-wider text-white/60">
              Message details
            </p>
          </div>

          <div className="p-4 space-y-2 text-[12px] max-h-[400px] overflow-y-auto">
            {/* FROM */}
            <DetailRow
              label="from"
              value={
                <span>
                  <span className="font-semibold text-white">{fromName}</span>
                  {fromEmail && (
                    <span className="text-white/50 ml-1">&lt;{fromEmail}&gt;</span>
                  )}
                </span>
              }
            />

            {replyToEmail && replyToEmail !== fromEmail && (
              <DetailRow
                label="reply-to"
                value={<span className="text-white/80">{replyToEmail}</span>}
              />
            )}

            {/* TO — dynamic recipient list */}
            <DetailRow
              label="to"
              value={
                <div className="space-y-0.5">
                  {toRecipients.length === 0 ? (
                    <span className="text-white/60 italic">No recipients</span>
                  ) : (
                    toRecipients.map((r, idx) => {
                      const isMe =
                        r.dsrt_email?.toLowerCase() === (myEmail || '').toLowerCase()
                      const label =
                        r.display_name ||
                        r.dsrt_email?.split('@')[0] ||
                        'Unknown'
                      return (
                        <div key={idx}>
                          <span className="font-semibold text-white">
                            {isMe ? 'me' : label}
                          </span>
                          {r.dsrt_email && (
                            <span className="text-white/50 ml-1">
                              &lt;{r.dsrt_email}&gt;
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              }
            />

            {/* CC */}
            {ccRecipients.length > 0 && (
              <DetailRow
                label="cc"
                value={
                  <div className="space-y-0.5">
                    {ccRecipients.map((r, idx) => {
                      const isMe =
                        r.dsrt_email?.toLowerCase() === (myEmail || '').toLowerCase()
                      const label =
                        r.display_name ||
                        r.dsrt_email?.split('@')[0] ||
                        'Unknown'
                      return (
                        <div key={idx}>
                          <span className="font-semibold text-white">
                            {isMe ? 'me' : label}
                          </span>
                          {r.dsrt_email && (
                            <span className="text-white/50 ml-1">
                              &lt;{r.dsrt_email}&gt;
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                }
              />
            )}

            {formattedDate && (
              <DetailRow
                label="date"
                value={<span className="text-white/80">{formattedDate}</span>}
              />
            )}

            {subject && (
              <DetailRow
                label="subject"
                value={<span className="text-white/80">{subject}</span>}
              />
            )}

            {/* Security */}
            {securityInfo && (
              <>
                <div className="pt-1.5 mt-1.5 border-t border-white/[0.06]" />
                {securityInfo.spf && (
                  <DetailRow
                    label="spf"
                    value={<SecurityBadge status={securityInfo.spf} />}
                  />
                )}
                {securityInfo.dkim && (
                  <DetailRow
                    label="dkim"
                    value={<SecurityBadge status={securityInfo.dkim} />}
                  />
                )}
                {securityInfo.dmarc && (
                  <DetailRow
                    label="dmarc"
                    value={<SecurityBadge status={securityInfo.dmarc} />}
                  />
                )}
                <DetailRow
                  label="security"
                  value={
                    <span className="inline-flex items-center gap-1.5 text-white/80">
                      <ShieldCheck
                        className={cn(
                          'w-3.5 h-3.5',
                          encryptionOK ? 'text-emerald-400' : 'text-amber-400'
                        )}
                        weight="fill"
                      />
                      {encryptionOK ? 'Standard encryption (TLS)' : 'No TLS'}
                    </span>
                  }
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[11px] uppercase tracking-wider font-semibold text-white/40 min-w-[65px] pt-0.5">
        {label}:
      </span>
      <span className="flex-1 min-w-0 break-words">{value}</span>
    </div>
  )
}

function SecurityBadge({ status }: { status: string }) {
  const isPass = /pass/i.test(status)
  return (
    <span
      className={cn(
        'text-[10.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border',
        isPass
          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
          : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
      )}
    >
      {status}
    </span>
  )
}