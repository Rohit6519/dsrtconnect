'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, Share, DotsThree, X, Check, ArrowLeft } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { AssessmentBadge } from '@/components/venture-assessment/AssessmentBadge'
import { BrandAssetCropper } from './brand/BrandAssetCropper'
import { DsrtPanel, DsrtButton, DsrtChip } from '@/components/dsrt'

interface Props {
  venture: any
  founder: any
  isOwner: boolean
  isFollowing: boolean
  onFollowToggle: () => void
  onUpdate: (patch: any) => Promise<void>
  onMessage?: () => void
  onConnect?: () => void
  stats?: {
    team: number
    followers: number
    applications: number
    openRoles: number
  }
}

const STAGES = [
  { value: 'idea', label: 'Idea' },
  { value: 'mvp', label: 'MVP' },
  { value: 'beta', label: 'Beta' },
  { value: 'launched', label: 'Launched' },
  { value: 'scaling', label: 'Scaling' },
  { value: 'active', label: 'Active' },
]

export function VentureHeader({
  venture: initialVenture,
  founder,
  isOwner,
  isFollowing,
  onFollowToggle,
  onUpdate,
  stats,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [venture, setVenture] = useState(initialVenture)

  const [cropperOpen, setCropperOpen] = useState<'logo' | 'cover' | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingTagline, setEditingTagline] = useState(false)
  const [editingStage, setEditingStage] = useState(false)
  const [nameDraft, setNameDraft] = useState(venture.name)
  const [taglineDraft, setTaglineDraft] = useState(venture.tagline || '')
  const [stageDraft, setStageDraft] = useState(venture.stage || 'idea')

  useEffect(() => {
    if (!venture.id) return
    const channel = supabase
      .channel(`venture:${venture.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ventures', filter: `id=eq.${venture.id}` },
        (payload) => setVenture((prev: any) => ({ ...prev, ...(payload.new as any) }))
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [venture.id, supabase])

  useEffect(() => {
    setVenture(initialVenture)
    setNameDraft(initialVenture.name)
    setTaglineDraft(initialVenture.tagline || '')
    setStageDraft(initialVenture.stage || 'idea')
  }, [initialVenture])

  const handleAssetSuccess = (kind: 'logo' | 'cover', url: string) => {
    setVenture((prev: any) => ({ ...prev, [kind === 'logo' ? 'logo_url' : 'cover_url']: url }))
    onUpdate({ [kind === 'logo' ? 'logo_url' : 'cover_url']: url }).catch(() => {})
  }

  const currentStage = STAGES.find(s => s.value === (venture.stage || 'idea'))?.label || 'Idea'

  const statParts: string[] = []
  const teamCount = stats?.team ?? 0
  const followerCount = venture.follower_count ?? 0
  const openRoleCount = stats?.openRoles ?? 0

  if (teamCount > 0) statParts.push(teamCount + ' team')
  statParts.push(followerCount + ' follower' + (followerCount !== 1 ? 's' : ''))
  if (openRoleCount > 0) statParts.push(openRoleCount + ' open role' + (openRoleCount !== 1 ? 's' : ''))
  const compactStatLine = statParts.join(' · ')

  return (
    <>
      <button
        onClick={() => router.push('/ventures')}
        className="flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-white/50 hover:text-white mb-3 transition-colors"
      >
        <ArrowLeft size={12} />
        Back to Ventures
      </button>

      <DsrtPanel padding="none" variant="default" className="overflow-hidden">
        <div className="relative h-[240px] sm:h-[280px] md:h-[320px] overflow-hidden">
          {venture.cover_url ? (
            <img src={venture.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#0a0a0f] to-[#1e3a5f]">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#2c5282_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-[#05070D]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

          {isOwner && (
            <DsrtButton
              size="xs"
              variant="outline"
              onClick={() => setCropperOpen('cover')}
              className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md"
            >
              <Camera size={13} />
              {venture.cover_url ? 'Change Cover' : 'Add Cover'}
            </DsrtButton>
          )}

          <div className="absolute inset-x-0 bottom-0 px-4 sm:px-6 md:px-8 pb-5 md:pb-7 z-10">
            <div className="flex items-end gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <div className="w-[80px] h-[80px] sm:w-[96px] sm:h-[96px] md:w-[112px] md:h-[112px] rounded-2xl border-[3px] border-[#05070D] bg-[#0f172a] overflow-hidden shadow-2xl">
                  {venture.logo_url ? (
                    <img src={venture.logo_url} alt={venture.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1e3a5f] to-[#0a0a0f] flex items-center justify-center text-white text-3xl sm:text-4xl font-bold">
                      {venture.name?.charAt(0)}
                    </div>
                  )}
                </div>
                {isOwner && (
                  <button
                    onClick={() => setCropperOpen('logo')}
                    className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#1e3a5f] border-2 border-[#05070D] hover:bg-[#2c5282] flex items-center justify-center transition-colors"
                    title="Change logo"
                  >
                    <Camera size={12} weight="regular" className="text-white" />
                  </button>
                )}
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {editingName && isOwner ? (
                    <div className="flex items-center gap-1.5 w-full max-w-md">
                      <input
                        autoFocus
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        className="flex-1 bg-white/[0.1] border border-white/[0.3] rounded px-3 py-1 text-[22px] sm:text-[28px] font-bold text-white focus:outline-none focus:border-white/[0.5]"
                      />
                      <button
                        onClick={async () => { if (nameDraft.trim()) { await onUpdate({ name: nameDraft.trim() }); setEditingName(false) } }}
                        className="w-8 h-8 rounded bg-white text-black hover:bg-zinc-200 flex items-center justify-center"
                      >
                        <Check size={14} weight="bold" />
                      </button>
                      <button
                        onClick={() => { setNameDraft(venture.name); setEditingName(false) }}
                        className="w-8 h-8 rounded text-white/70 hover:text-white flex items-center justify-center"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <h1
                      onClick={() => isOwner && setEditingName(true)}
                      className={'text-[22px] sm:text-[28px] md:text-[32px] font-bold text-white leading-none tracking-tight ' + (isOwner ? 'cursor-pointer hover:opacity-80' : '')}
                      style={{ textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}
                    >
                      {venture.name}
                    </h1>
                  )}

                  {editingStage && isOwner ? (
                    <select
                      autoFocus value={stageDraft}
                      onChange={async (e) => {
                        setStageDraft(e.target.value)
                        await onUpdate({ stage: e.target.value })
                        setEditingStage(false)
                      }}
                      onBlur={() => setEditingStage(false)}
                      className="bg-[#0f172a] border border-white/[0.2] text-white text-[11px] font-mono uppercase tracking-wider rounded-md px-2 py-1 outline-none"
                    >
                      {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  ) : (
                    <DsrtChip size="sm" tone="accent" onClick={isOwner ? () => setEditingStage(true) : undefined}>
                      {currentStage}
                    </DsrtChip>
                  )}

                  {venture.has_verified_assessment && <AssessmentBadge variant="compact" />}
                </div>

                <div className="mb-3">
                  {editingTagline && isOwner ? (
                    <div className="flex items-center gap-1.5 max-w-2xl">
                      <input
                        autoFocus value={taglineDraft} onChange={(e) => setTaglineDraft(e.target.value)}
                        maxLength={140}
                        placeholder="Add a one-line company thesis..."
                        className="flex-1 bg-white/[0.1] border border-white/[0.3] rounded px-3 py-1.5 text-[14px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/[0.5]"
                      />
                      <button
                        onClick={async () => { await onUpdate({ tagline: taglineDraft }); setEditingTagline(false) }}
                        className="w-7 h-7 rounded bg-white text-black flex items-center justify-center hover:bg-zinc-200"
                      >
                        <Check size={13} weight="bold" />
                      </button>
                      <button
                        onClick={() => { setTaglineDraft(venture.tagline || ''); setEditingTagline(false) }}
                        className="w-7 h-7 rounded text-white/70 hover:text-white flex items-center justify-center"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <p
                      onClick={() => isOwner && setEditingTagline(true)}
                      className={'text-[14px] sm:text-[15px] leading-relaxed max-w-2xl ' +
                        (venture.tagline ? 'text-white/90 ' + (isOwner ? 'cursor-pointer hover:text-white' : '') : 'text-white/50 italic ' + (isOwner ? 'cursor-pointer hover:text-white/70' : ''))
                      }
                      style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
                    >
                      {venture.tagline || (isOwner ? 'Click to add a one-line company thesis...' : '')}
                    </p>
                  )}
                </div>

                <div
                  className="flex items-center gap-2 text-[11px] font-mono text-white/60 flex-wrap"
                  style={{ textShadow: '0 1px 6px rgba(0,0,0,0.5)' }}
                >
                  {venture.venture_number && (
                    <>
                      <span>{venture.venture_number}</span>
                      <span className="text-white/20">·</span>
                    </>
                  )}
                  <span>{compactStatLine}</span>
                  {venture.industry && (<><span className="text-white/20">·</span><span>{venture.industry}</span></>)}
                  {venture.headquarters && (<><span className="text-white/20">·</span><span>{venture.headquarters}</span></>)}
                </div>
              </div>

              {/* Actions (Desktop) */}
              <div className="hidden md:flex items-center gap-2 flex-shrink-0 self-end mb-1">
                {!isOwner && (
                  <>
                    <ConnectButton
                      entityType="venture" entityId={venture.id} entityName={venture.name}
                      entitySlug={venture.slug} sourceType="venture_invite"
                      variant="primary" label="Contact Team" icon={true}
                    />
                    <DsrtButton
                      size="md"
                      variant={isFollowing ? 'outline' : 'white'}
                      onClick={onFollowToggle}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </DsrtButton>
                  </>
                )}
                <DsrtButton
                  size="icon"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied') }}
                >
                  <Share size={13} />
                </DsrtButton>
                <DsrtButton size="icon" variant="outline">
                  <DotsThree size={15} weight="bold" />
                </DsrtButton>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Actions */}
        {!isOwner && (
          <div className="md:hidden p-3 border-t border-white/[0.06] grid grid-cols-2 gap-2">
            <ConnectButton
              entityType="venture" entityId={venture.id} entityName={venture.name}
              entitySlug={venture.slug} sourceType="venture_invite"
              variant="primary" label="Contact" icon={true}
            />
            <DsrtButton
              size="md"
              variant={isFollowing ? 'outline' : 'white'}
              onClick={onFollowToggle}
              fullWidth
            >
              {isFollowing ? 'Following' : 'Follow'}
            </DsrtButton>
          </div>
        )}
      </DsrtPanel>

      {cropperOpen && (
        <BrandAssetCropper
          open={!!cropperOpen}
          kind={cropperOpen}
          slug={venture.slug}
          currentUrl={cropperOpen === 'logo' ? venture.logo_url : venture.cover_url}
          currentCropMetadata={cropperOpen === 'logo' ? venture.logo_crop_metadata : venture.cover_crop_metadata}
          onClose={() => setCropperOpen(null)}
          onSuccess={(url) => handleAssetSuccess(cropperOpen, url)}
        />
      )}
    </>
  )
}