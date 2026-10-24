'use client'

import { useEffect, useState } from 'react'
import { X, Link as LinkIcon, TwitterLogo, LinkedinLogo, Copy, Check } from '@phosphor-icons/react'
import type { TeamUpItem } from '@/types/teamup'

interface Props {
  item: TeamUpItem
  onClose: () => void
}

export function ShareModal({ item, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/looking-for/${item.source_id}?source=${item.source_type}`
    : ''

  const shareText = `${item.title}${item.tagline ? ' — ' + item.tagline : ''}`

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h2 className="text-[15px] font-semibold text-white">Share opportunity</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-900"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Copy link */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2">
              Link
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 h-9 px-3 rounded-md bg-zinc-950 border border-zinc-800 text-[12.5px] text-zinc-300 focus:outline-none"
              />
              <button
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-zinc-800 hover:border-zinc-700 text-[12.5px] font-medium text-zinc-300"
              >
                {copied ? (
                  <>
                    <Check size={13} weight="bold" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={13} weight="regular" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Social share */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-2">
              Share to
            </label>
            <div className="grid grid-cols-3 gap-2">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-center gap-1.5 h-16 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                <TwitterLogo size={16} weight="regular" />
                <span className="text-[11px]">Twitter</span>
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-col items-center gap-1.5 h-16 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                <LinkedinLogo size={16} weight="regular" />
                <span className="text-[11px]">LinkedIn</span>
              </a>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: item.title, text: shareText, url }).catch(() => null)
                  } else {
                    copyLink()
                  }
                }}
                className="inline-flex flex-col items-center gap-1.5 h-16 rounded-md border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
              >
                <LinkIcon size={16} weight="regular" />
                <span className="text-[11px]">More</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
