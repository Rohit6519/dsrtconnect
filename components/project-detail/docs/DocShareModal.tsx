'use client'

import { useState } from 'react'
import { X, Link, Check, Globe, EyeSlash } from '@phosphor-icons/react'

interface Props {
  slug: string
  docSlug: string | null
  isPublished: boolean
  onClose: () => void
  onTogglePublish: () => void
}

export function DocShareModal({ slug, docSlug, isPublished, onClose, onTogglePublish }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl = typeof window !== 'undefined' && docSlug
    ? window.location.origin + '/docs/' + slug + '/' + docSlug
    : ''

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f0f18] border border-white/[0.08] rounded-2xl w-full max-w-[460px] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Link size={16} className="text-purple-300" />
            <h3 className="text-[15px] font-semibold text-white">Share this document</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className={
            'flex items-start gap-3 p-3 rounded-lg border ' +
            (isPublished
              ? 'bg-emerald-500/[0.05] border-emerald-500/25'
              : 'bg-orange-500/[0.05] border-orange-500/25')
          }>
            {isPublished ? (
              <>
                <Globe size={14} weight="fill" className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">Anyone with the link can view</p>
                  <p className="text-[11.5px] text-white/60 mt-0.5">This doc is published — no login required to read.</p>
                </div>
              </>
            ) : (
              <>
                <EyeSlash size={14} weight="fill" className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">This document is unpublished</p>
                  <p className="text-[11.5px] text-white/60 mt-0.5">Publish it to make the share link work publicly.</p>
                </div>
                <button
                  onClick={onTogglePublish}
                  className="text-[11px] font-semibold bg-white text-black hover:bg-white/90 px-2.5 h-7 rounded-md"
                >
                  Publish
                </button>
              </>
            )}
          </div>

          {docSlug && (
            <div>
              <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5 block">Public link</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 h-9 bg-white/[0.04] border border-white/[0.1] rounded-md px-3 text-[12px] text-white/85 font-mono outline-none"
                />
                <button
                  onClick={copy}
                  className="flex items-center gap-1.5 px-3 h-9 text-[12px] font-semibold bg-white text-black hover:bg-white/90 rounded-md whitespace-nowrap"
                >
                  {copied ? <><Check size={12} weight="bold" /> Copied</> : <><Link size={12} /> Copy</>}
                </button>
              </div>
              <p className="text-[10.5px] text-white/40 mt-2 leading-snug">
                Share this URL anywhere — Twitter, email, Slack. Readers do not need a DSRT account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
