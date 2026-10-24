'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import {
  X, Copy, ShareNetwork, Code, Check, Link as LinkIcon, PaperPlaneTilt,
} from '@phosphor-icons/react'

interface Props {
  slug: string
  updateId: string
  updateTitle?: string | null
  anchorEl: HTMLElement | null
  onClose: () => void
}

interface Position {
  top: number
  left: number
  origin: 'top-right' | 'bottom-right'
}

export function UpdateShareMenu({
  slug, updateId, updateTitle, anchorEl, onClose,
}: Props) {
  const [pos, setPos] = useState<Position | null>(null)
  const [copiedField, setCopiedField] = useState<'link' | 'embed' | null>(null)
  const [supportsNativeShare, setSupportsNativeShare] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/projects/${slug}#update-${updateId}`
      : `/projects/${slug}#update-${updateId}`

  const embedMarkdown = `[${updateTitle || 'Project Update'}](${shareUrl})`

  // ─── Detect native share support ────────────────────────────────
  useEffect(() => {
    setSupportsNativeShare(
      typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function'
    )
  }, [])

  // ─── Position popover relative to anchor ────────────────────────
  useEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const popWidth = 280
    const popHeight = 240
    const gap = 6
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Prefer below-and-right
    let top = rect.bottom + gap
    let left = rect.right - popWidth
    let origin: Position['origin'] = 'top-right'

    // If not enough space below, place above
    if (top + popHeight > vh - 12) {
      top = rect.top - popHeight - gap
      origin = 'bottom-right'
    }

    // Keep on-screen horizontally
    if (left < 12) left = 12
    if (left + popWidth > vw - 12) left = vw - popWidth - 12

    setPos({ top, left, origin })
  }, [anchorEl])

  // ─── Click outside + ESC ────────────────────────────────────────
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!popRef.current) return
      if (popRef.current.contains(e.target as Node)) return
      if (anchorEl && anchorEl.contains(e.target as Node)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Delay attach to avoid catching the click that opened the menu
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onClick)
      document.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, anchorEl])

  // ─── Actions ────────────────────────────────────────────────────
  const doCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedField('link')
      toast.success('Link copied')
      setTimeout(() => setCopiedField(null), 1600)
    } catch {
      toast.error('Could not copy')
    }
  }, [shareUrl])

  const doCopyEmbed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedMarkdown)
      setCopiedField('embed')
      toast.success('Markdown copied')
      setTimeout(() => setCopiedField(null), 1600)
    } catch {
      toast.error('Could not copy')
    }
  }, [embedMarkdown])

  const doNativeShare = useCallback(async () => {
    try {
      await (navigator as any).share({
        title: updateTitle || 'Project Update',
        url: shareUrl,
      })
      onClose()
    } catch (err: any) {
      // AbortError = user dismissed native sheet — silent
      if (err?.name === 'AbortError') return
      // Fall back to clipboard on failure
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Link copied')
        onClose()
      } catch {
        toast.error('Share failed')
      }
    }
  }, [updateTitle, shareUrl, onClose])

  if (!pos) return null

  const content = (
    <div
      ref={popRef}
      role="menu"
      aria-label="Share update"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 280,
        zIndex: 200,
        transformOrigin: pos.origin === 'top-right' ? 'top right' : 'bottom right',
      }}
      className="bg-[#0d0d10] border border-white/[0.1] rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <ShareNetwork size={13} weight="regular" className="text-white/60" />
          <span className="text-[12px] font-semibold text-white">Share update</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-6 h-6 rounded text-white/40 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors"
        >
          <X size={13} />
        </button>
      </div>

      {/* Options */}
      <div className="p-2 space-y-0.5">
        <ShareOption
          icon={copiedField === 'link' ? Check : LinkIcon}
          iconTone={copiedField === 'link' ? 'text-emerald-400' : 'text-white/60'}
          title={copiedField === 'link' ? 'Copied!' : 'Copy link'}
          subtitle="Direct URL to this update"
          onClick={doCopyLink}
        />

        {supportsNativeShare && (
          <ShareOption
            icon={PaperPlaneTilt}
            iconTone="text-white/60"
            title="Share via…"
            subtitle="Use your device's share sheet"
            onClick={doNativeShare}
          />
        )}

        <ShareOption
          icon={copiedField === 'embed' ? Check : Code}
          iconTone={copiedField === 'embed' ? 'text-emerald-400' : 'text-white/60'}
          title={copiedField === 'embed' ? 'Copied!' : 'Copy embed markdown'}
          subtitle="Paste into docs, posts, or wikis"
          onClick={doCopyEmbed}
        />
      </div>

      {/* URL preview */}
      <div className="px-3 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9.5px] font-mono uppercase tracking-wider text-white/35">Link</span>
        </div>
        <p className="text-[11px] text-white/60 font-mono truncate" title={shareUrl}>
          {shareUrl}
        </p>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB
// ═══════════════════════════════════════════════════════════════════════════

function ShareOption({
  icon: Icon, iconTone, title, subtitle, onClick,
}: {
  icon: any
  iconTone: string
  title: string
  subtitle: string
  onClick: () => void
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-md text-left hover:bg-white/[0.05] transition-colors group"
    >
      <div className="w-8 h-8 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/[0.08]">
        <Icon size={14} weight="regular" className={iconTone} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-white leading-tight">{title}</p>
        <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{subtitle}</p>
      </div>
    </button>
  )
}