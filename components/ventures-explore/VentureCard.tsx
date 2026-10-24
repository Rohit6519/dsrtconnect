'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DotsThree, MapPin, Users, CheckCircle, EyeSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ExploreVentureCard } from '@/lib/venture-explore/types'
import { STAGES } from '@/lib/config/sectors'
import { getAffinityLearner } from '@/lib/venture-explore/affinity-learner'
import { DsrtPanel, DsrtAvatar, DsrtChip } from '@/components/dsrt'

interface VentureCardProps {
  venture: ExploreVentureCard
  onNotInterested?: (id: string) => void
  position?: number
  moduleType?: string
}

export function VentureCard({ venture, onNotInterested, position = 0, moduleType }: VentureCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const impressionFiredRef = useRef(false)

  const stageConfig = STAGES.find(s => s.id === venture.stage)
  const domainSlugs = [venture.industry, venture.sector, venture.sub_category].filter(Boolean) as string[]

  useEffect(() => {
    if (!cardRef.current || impressionFiredRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !impressionFiredRef.current) {
          impressionFiredRef.current = true

          getAffinityLearner().track({
            venture_id: venture.id,
            action: 'view',
            domain_slugs: domainSlugs,
          })

          fetch('/api/ventures/explore/impression', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              venture_id: venture.id,
              module_type: moduleType || 'unknown',
              position,
            }),
            keepalive: true,
          }).catch(() => {})
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [venture.id, position, moduleType, domainSlugs])

  const handleCardClick = () => {
    getAffinityLearner().track({
      venture_id: venture.id,
      action: 'click',
      domain_slugs: domainSlugs,
    })
    router.push(`/ventures/${venture.slug}`)
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/ventures/${venture.slug}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
    setMenuOpen(false)
    getAffinityLearner().track({ venture_id: venture.id, action: 'share', domain_slugs: domainSlugs })
  }

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setMenuOpen(false)
    if (onNotInterested) onNotInterested(venture.id)

    getAffinityLearner().track({ venture_id: venture.id, action: 'dismiss', domain_slugs: domainSlugs })

    try {
      await fetch('/api/ventures/explore/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venture_id: venture.id, reason: 'not_relevant' })
      })
      toast.info('Venture hidden from recommendations')
    } catch {}
  }

  return (
    <DsrtPanel
      ref={cardRef as any}
      padding="none"
      variant="default"
      onClick={handleCardClick}
      className="group cursor-pointer hover:border-white/[0.14] transition-all flex flex-col overflow-hidden"
    >
      {/* Cover */}
      <div className="relative w-full aspect-[16/9] bg-[#05070D] border-b border-white/[0.06] overflow-hidden">
        {venture.cover_url ? (
          <img
            src={venture.cover_url}
            alt={venture.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#0a0a0f]">
            <span className="text-3xl font-bold text-white/20">{venture.name[0]?.toUpperCase()}</span>
          </div>
        )}

        <div className="absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-[#05070D] border border-white/[0.12] p-0.5 shadow-lg overflow-hidden flex-shrink-0">
          {venture.logo_url ? (
            <img src={venture.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <div className="w-full h-full bg-white/[0.04] rounded-lg flex items-center justify-center text-xs font-bold text-white">
              {venture.name[0]?.toUpperCase()}
            </div>
          )}
        </div>

        {venture.reason_label && (
          <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-mono text-white/70 uppercase tracking-wider">
            {venture.reason_label}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-[15px] font-bold text-white truncate tracking-tight">
                  {venture.name}
                </h3>
                {venture.is_verified && (
                  <CheckCircle size={14} weight="fill" className="text-[#93c5fd] shrink-0" />
                )}
              </div>
            </div>

            <div className="relative shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                className="w-7 h-7 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              >
                <DotsThree size={18} weight="bold" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-44 bg-[#0a0f1a] border border-white/[0.1] rounded-xl shadow-2xl p-1 space-y-0.5">
                    <button onClick={(e) => { e.stopPropagation(); handleCardClick(); }} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg">
                      Open venture
                    </button>
                    <button onClick={handleShare} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-white/80 hover:text-white hover:bg-white/[0.06] rounded-lg">
                      Share link
                    </button>
                    <div className="h-px bg-white/[0.06] my-1" />
                    <button onClick={handleDismiss} className="w-full text-left px-3 py-1.5 text-[12px] font-medium text-amber-300 hover:bg-amber-500/10 rounded-lg flex items-center gap-1.5">
                      <EyeSlash size={12} /> Not interested
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {venture.tagline && (
            <p className="text-[12.5px] text-white/60 line-clamp-2 leading-relaxed">
              {venture.tagline}
            </p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {venture.industry && <DsrtChip size="sm" tone="accent">{venture.industry}</DsrtChip>}
            {stageConfig && <DsrtChip size="sm" tone="neutral">{stageConfig.label}</DsrtChip>}
            {venture.location && (
              <span className="text-[10px] text-white/40 flex items-center gap-1">
                <MapPin size={10} /> {venture.location.split(',')[0]}
              </span>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-white/40">
          {venture.founder ? (
            <Link
              href={`/profile/${venture.founder.username}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-white transition-colors min-w-0"
            >
              <DsrtAvatar src={venture.founder.avatar_url} name={venture.founder.full_name} size="xs" />
              <span className="truncate">{venture.founder.full_name}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 font-mono">
              <Users size={12} /> {venture.team_size || 1} Builder{(venture.team_size || 1) !== 1 ? 's' : ''}
            </span>
          )}

          {venture.is_hiring && (
            <DsrtChip size="sm" tone="success">Hiring</DsrtChip>
          )}
        </div>
      </div>
    </DsrtPanel>
  )
}