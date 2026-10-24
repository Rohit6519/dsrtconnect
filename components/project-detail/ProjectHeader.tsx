'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, Heart, UsersThree, ArrowLeft,
  PencilSimple, Camera, Certificate, Buildings, Trophy, Check
} from '@phosphor-icons/react'
import { ImageCropperModal } from './ImageCropperModal'
import { ConnectButton } from '@/components/shared/ConnectButton'
import { DsrtPanel, DsrtButton, DsrtChip } from '@/components/dsrt'

interface Project {
  id: string
  slug: string
  name: string
  short_description: string | null
  tagline: string | null
  logo_url: string | null
  cover_image_url: string | null
  icon: string | null
  color: string | null
  stage: string
  project_number: string
  global_rank: number | null
  category_rank: number | null
  industry: string | null
  category: string[]
  tech_stack: string[]
  founder_verified: boolean
  is_dsrt_verified: boolean
  is_open_source: boolean
  community_verified: boolean
  won_competition: boolean
  project_type: string
  follower_count: number
  founder_id: string | null
  user_id: string | null
  founded_date: string | null
}

interface Props {
  project: Project
  isOwner: boolean
  isFollowing: boolean
  onFollowToggle: () => Promise<void>
  onCollaborate: () => void
  onUpdate: (patch: Partial<Project>) => Promise<void>
  onUploadMedia: (file: File, kind: 'logo' | 'cover') => Promise<string | null>
}

const STAGES = ['idea','research','planning','prototype','mvp','beta','production','scaling','completed','on-hold']
const STAGE_LABELS: Record<string, string> = {
  idea:'Idea', research:'Research', planning:'Planning', prototype:'Prototype',
  mvp:'MVP', beta:'Beta', production:'Production', scaling:'Scaling',
  completed:'Completed', 'on-hold':'On Hold'
}

function formatFoundedDate(d: string | null): string {
  if (!d) return ''
  return 'Started ' + new Date(d).toLocaleDateString('en', { month: 'short', year: 'numeric' })
}

export function ProjectHeader({
  project, isOwner, isFollowing,
  onFollowToggle, onCollaborate,
  onUpdate, onUploadMedia
}: Props) {
  const router = useRouter()
  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [followLoading, setFollowLoading] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [editingStage, setEditingStage] = useState(false)
  const [tempName, setTempName] = useState(project.name)
  const [tempDesc, setTempDesc] = useState(project.short_description || project.tagline || '')

  const [cropperSrc, setCropperSrc] = useState<string | null>(null)
  const [cropperKind, setCropperKind] = useState<'logo' | 'cover' | null>(null)
  const [cropperAspect, setCropperAspect] = useState<number>(1)

  const handleFollow = async () => {
    setFollowLoading(true)
    try { await onFollowToggle() } finally { setFollowLoading(false) }
  }

  const handleFileSelect = (kind: 'logo' | 'cover', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCropperSrc(reader.result as string)
      setCropperKind(kind)
      setCropperAspect(kind === 'logo' ? 1 : 4)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleCropConfirm = async (blob: Blob) => {
    if (!cropperKind) return
    const filename = cropperKind + '.jpg'
    const file = new File([blob], filename, { type: 'image/jpeg' })
    const url = await onUploadMedia(file, cropperKind)
    if (url) {
      await onUpdate(cropperKind === 'logo' ? { logo_url: url } : { cover_image_url: url })
    }
    setCropperSrc(null)
    setCropperKind(null)
  }

  const saveName = async () => {
    const v = tempName.trim()
    if (v && v !== project.name) await onUpdate({ name: v })
    setEditingName(false)
  }

  const saveDesc = async () => {
    const v = tempDesc.trim()
    if (v !== (project.short_description || '')) await onUpdate({ short_description: v })
    setEditingDesc(false)
  }

  const rankLine: string[] = []
  if (project.global_rank) rankLine.push('#' + project.global_rank + ' Global')
  if (project.category_rank && project.industry) rankLine.push('#' + project.category_rank + ' in ' + project.industry)

  return (
    <>
      <div className="mb-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft size={12} /> Back to Projects
        </button>
      </div>

      <DsrtPanel variant="default" padding="none" className="overflow-hidden">
        {/* Cover image */}
        <div className="relative w-full h-[160px] sm:h-[200px] md:h-[240px] overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#0a0a0f] to-[#1e3a5f] group/cover">
          {project.cover_image_url ? (
            <img src={project.cover_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full opacity-20 bg-[radial-gradient(#2c5282_1px,transparent_1px)] [background-size:16px_16px]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070D] via-transparent to-transparent" />

          {isOwner && (
            <>
              <DsrtButton
                size="xs"
                variant="outline"
                onClick={() => coverInputRef.current?.click()}
                className="absolute top-4 right-4 z-10 opacity-0 group-hover/cover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md"
              >
                <Camera size={13} /> Change Cover
              </DsrtButton>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect('cover', e)} />
            </>
          )}
        </div>

        {/* Info Row */}
        <div className="p-4 sm:p-6 md:p-8 -mt-12 sm:-mt-16 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            {/* Logo */}
            <div className="relative flex-shrink-0 group/logo">
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl bg-[#05070D] border-2 border-white/10 overflow-hidden flex items-center justify-center shadow-2xl">
                {project.logo_url ? (
                  <img src={project.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-white/80">{(project.name || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {isOwner && (
                <>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#0f172a] border-2 border-[#05070D] text-white/70 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <Camera size={13} weight="bold" />
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect('logo', e)} />
                </>
              )}
            </div>

            {/* Title & Specs */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {editingName ? (
                  <input
                    autoFocus
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onBlur={saveName}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setTempName(project.name); setEditingName(false) } }}
                    className="text-[22px] sm:text-[28px] font-bold text-white bg-white/[0.06] border border-white/20 rounded-lg px-2 py-0.5 outline-none w-full max-w-md"
                  />
                ) : (
                  <h1
                    className={'text-[22px] sm:text-[28px] md:text-[32px] font-bold text-white leading-tight tracking-tight ' + (isOwner ? 'cursor-pointer hover:bg-white/[0.04] rounded px-1 -mx-1' : '')}
                    onClick={() => isOwner && setEditingName(true)}
                  >
                    {project.name}
                    {isOwner && <PencilSimple size={13} className="inline ml-2 opacity-40" />}
                  </h1>
                )}

                {editingStage ? (
                  <select
                    autoFocus
                    value={project.stage}
                    onChange={async (e) => { await onUpdate({ stage: e.target.value }); setEditingStage(false) }}
                    onBlur={() => setEditingStage(false)}
                    className="text-[11px] font-mono text-white bg-[#0f172a] border border-white/20 rounded px-2 py-1 uppercase"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                  </select>
                ) : (
                  <DsrtChip size="sm" tone="accent" onClick={isOwner ? () => setEditingStage(true) : undefined}>
                    {STAGE_LABELS[project.stage] || project.stage}
                  </DsrtChip>
                )}
              </div>

              {editingDesc ? (
                <input
                  autoFocus
                  value={tempDesc}
                  onChange={(e) => setTempDesc(e.target.value)}
                  onBlur={saveDesc}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveDesc(); if (e.key === 'Escape') { setTempDesc(project.short_description || ''); setEditingDesc(false) } }}
                  placeholder="One line describing what this project does..."
                  className="text-[13px] text-white/80 bg-white/[0.06] border border-white/20 rounded px-2 py-1 outline-none w-full max-w-2xl mb-2"
                />
              ) : (
                <p
                  className={'text-[14px] sm:text-[15px] text-white/70 leading-relaxed mb-3 max-w-2xl ' + (isOwner ? 'cursor-pointer hover:bg-white/[0.04] rounded px-1 -mx-1' : '')}
                  onClick={() => isOwner && setEditingDesc(true)}
                >
                  {project.short_description || project.tagline || (isOwner ? 'Click to add a short description...' : 'No description provided')}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-mono text-white/40 mb-3">
                <span>{project.project_number}</span>
                <span>·</span>
                <span>{project.follower_count.toLocaleString()} followers</span>
                {project.founded_date && (
                  <>
                    <span>·</span>
                    <span>{formatFoundedDate(project.founded_date)}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {project.founder_verified && (
                  <DsrtChip size="sm" tone="accent" icon={<Check size={10} />}>Verified Founder</DsrtChip>
                )}
                {project.is_dsrt_verified && (
                  <DsrtChip size="sm" tone="accent" icon={<Certificate size={10} />}>DSRT Verified</DsrtChip>
                )}
                {project.is_open_source && (
                  <DsrtChip size="sm" tone="success" icon={<CheckCircle size={10} />}>Open Source</DsrtChip>
                )}
                {project.won_competition && (
                  <DsrtChip size="sm" tone="warning" icon={<Trophy size={10} />}>Award Winner</DsrtChip>
                )}
              </div>
            </div>

            {/* Actions */}
            {!isOwner && (
              <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                <DsrtButton
                  size="md"
                  variant={isFollowing ? 'outline' : 'white'}
                  loading={followLoading}
                  onClick={handleFollow}
                  className="flex-1 md:flex-none"
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </DsrtButton>
                <DsrtButton
                  size="md"
                  variant="primary"
                  onClick={onCollaborate}
                  className="flex-1 md:flex-none"
                >
                  <UsersThree size={14} /> Collaborate
                </DsrtButton>
              </div>
            )}
          </div>
        </div>
      </DsrtPanel>

      {cropperSrc && cropperKind && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          aspect={cropperAspect}
          cropShape="rect"
          onCancel={() => { setCropperSrc(null); setCropperKind(null) }}
          onConfirm={handleCropConfirm}
        />
      )}
    </>
  )
}