'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  User, PuzzlePiece, Rocket, Buildings, Check,
  CircleNotch, Warning, ArrowRight, CaretDown,
} from '@phosphor-icons/react'
import type { DraftState } from './useDraftEditor'

type ContextType = 'personal' | 'project' | 'venture' | 'organization'

interface Entity {
  id: string
  slug?: string
  name: string
  tagline?: string | null
  logo_url?: string | null
  icon?: string | null
  is_verified?: boolean
}

interface Props {
  draft: DraftState
  onChange: (patch: Partial<DraftState>) => void
  onClose: () => void
}

export function ContextSelectorModal({ draft, onChange, onClose }: Props) {
  const [step, setStep] = useState<'type' | 'entity'>('type')
  const [selectedType, setSelectedType] = useState<ContextType>(draft.context_type)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Entity[]>([])
  const [ventures, setVentures] = useState<Entity[]>([])
  const [organizations, setOrganizations] = useState<Entity[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/looking-for/my-entities')
        if (!res.ok) throw new Error('Failed to load entities')
        const data = await res.json()
        if (cancelled) return
        setProjects(data.projects || [])
        setVentures(data.ventures || [])
        setOrganizations(data.organizations || [])
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const commitPersonal = () => {
    onChange({
      context_type: 'personal',
      project_id: null,
      venture_id: null,
      organization_id: null,
    })
    onClose()
  }

  const commitEntity = (type: ContextType, entityId: string) => {
    const patch: Partial<DraftState> = {
      context_type: type,
      project_id: type === 'project' ? entityId : null,
      venture_id: type === 'venture' ? entityId : null,
      organization_id: type === 'organization' ? entityId : null,
    }
    onChange(patch)
    onClose()
  }

  const currentList =
    selectedType === 'project' ? projects :
    selectedType === 'venture' ? ventures :
    selectedType === 'organization' ? organizations : []

  const currentSelectedId =
    selectedType === 'project' ? draft.project_id :
    selectedType === 'venture' ? draft.venture_id :
    selectedType === 'organization' ? draft.organization_id : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-xl border border-zinc-800 bg-[#0a0a0a] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-1">
            Posting context
          </div>
          <h2 className="text-[16px] font-semibold text-white">
            {step === 'type' ? 'Post on behalf of' : `Select a ${selectedType}`}
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {step === 'type' ? (
            <div className="space-y-2">
              <TypeCard
                Icon={User}
                title="Personal"
                description="Just you — a personal opportunity or collaboration"
                selected={draft.context_type === 'personal'}
                onClick={commitPersonal}
              />
              <TypeCard
                Icon={PuzzlePiece}
                title="Project"
                description={
                  loading ? 'Loading...' :
                  projects.length === 0 ? 'You don\'t own any projects yet' :
                  `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} available`
                }
                selected={draft.context_type === 'project' && !!draft.project_id}
                disabled={!loading && projects.length === 0}
                selectedName={draft.context_type === 'project' ? projects.find(p => p.id === draft.project_id)?.name : undefined}
                onClick={() => {
                  if (projects.length === 0) return
                  setSelectedType('project')
                  setStep('entity')
                }}
              />
              <TypeCard
                Icon={Rocket}
                title="Venture"
                description={
                  loading ? 'Loading...' :
                  ventures.length === 0 ? 'You don\'t own any ventures yet' :
                  `${ventures.length} ${ventures.length === 1 ? 'venture' : 'ventures'} available`
                }
                selected={draft.context_type === 'venture' && !!draft.venture_id}
                disabled={!loading && ventures.length === 0}
                selectedName={draft.context_type === 'venture' ? ventures.find(v => v.id === draft.venture_id)?.name : undefined}
                onClick={() => {
                  if (ventures.length === 0) return
                  setSelectedType('venture')
                  setStep('entity')
                }}
              />
              <TypeCard
                Icon={Buildings}
                title="Organization"
                description={
                  loading ? 'Loading...' :
                  organizations.length === 0 ? 'You don\'t lead any organizations' :
                  `${organizations.length} ${organizations.length === 1 ? 'organization' : 'organizations'} available`
                }
                selected={draft.context_type === 'organization' && !!draft.organization_id}
                disabled={!loading && organizations.length === 0}
                selectedName={draft.context_type === 'organization' ? organizations.find(o => o.id === draft.organization_id)?.name : undefined}
                onClick={() => {
                  if (organizations.length === 0) return
                  setSelectedType('organization')
                  setStep('entity')
                }}
              />

              {error && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-md border border-red-500/30 bg-red-500/5 text-[12.5px] text-red-400">
                  <Warning size={12} weight="fill" className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-zinc-800/60 text-[11.5px] text-zinc-500 leading-relaxed">
                Opportunities posted from a project, venture, or organization appear on that entity's page and drive discovery. Only entities you have permission to post from are shown.
              </div>
            </div>
          ) : (
            <div>
              <button
                onClick={() => setStep('type')}
                className="inline-flex items-center gap-1 text-[11.5px] text-zinc-500 hover:text-zinc-300 mb-4"
              >
                ← Change context type
              </button>
              {loading ? (
                <div className="flex items-center justify-center py-10 text-zinc-500 text-[12.5px]">
                  <CircleNotch size={14} className="animate-spin mr-2" />
                  Loading...
                </div>
              ) : currentList.length === 0 ? (
                <div className="text-center py-10 text-[12.5px] text-zinc-500">
                  No {selectedType}s available.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {currentList.map(e => (
                    <EntityRow
                      key={e.id}
                      entity={e}
                      selected={currentSelectedId === e.id}
                      onClick={() => commitEntity(selectedType, e.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TypeCard({
  Icon, title, description, selected, disabled, selectedName, onClick,
}: {
  Icon: any
  title: string
  description: string
  selected: boolean
  disabled?: boolean
  selectedName?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        'w-full text-left p-4 rounded-lg border transition-all group ' +
        (selected
          ? 'border-blue-500/40 bg-blue-500/[0.04]'
          : disabled
          ? 'border-zinc-800 bg-zinc-950/40 opacity-40 cursor-not-allowed'
          : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600 hover:bg-zinc-900/40')
      }
    >
      <div className="flex items-start gap-3">
        <div className={
          'w-9 h-9 rounded-md flex items-center justify-center shrink-0 transition-colors ' +
          (selected ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-200')
        }>
          <Icon size={16} weight="regular" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={
              'text-[14px] font-semibold ' +
              (selected ? 'text-white' : 'text-zinc-200')
            }>
              {title}
            </div>
            {selected && <Check size={12} weight="bold" className="text-blue-400" />}
          </div>
          {selectedName && selected ? (
            <div className="text-[12px] text-blue-300 mt-0.5 truncate">
              {selectedName}
            </div>
          ) : (
            <div className="text-[12px] text-zinc-500 mt-0.5 leading-relaxed">
              {description}
            </div>
          )}
        </div>
        {!disabled && !selected && (
          <ArrowRight size={12} weight="bold" className="text-zinc-600 group-hover:text-zinc-300 shrink-0 mt-2" />
        )}
      </div>
    </button>
  )
}

function EntityRow({
  entity, selected, onClick,
}: {
  entity: Entity
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'w-full flex items-center gap-3 p-3 rounded-lg border transition-all group ' +
        (selected
          ? 'border-blue-500/40 bg-blue-500/[0.04]'
          : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-600')
      }
    >
      <div className="w-9 h-9 rounded-md overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center relative">
        {entity.logo_url ? (
          <Image src={entity.logo_url} alt="" fill className="object-cover" sizes="36px" />
        ) : entity.icon ? (
          <span className="text-[16px]">{entity.icon}</span>
        ) : (
          <span className="text-[13px] text-zinc-500 font-medium">
            {entity.name?.[0]?.toUpperCase() || '?'}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          <div className={
            'text-[13.5px] font-semibold truncate ' +
            (selected ? 'text-white' : 'text-zinc-200')
          }>
            {entity.name}
          </div>
          {entity.is_verified && <Check size={11} weight="bold" className="text-blue-400 shrink-0" />}
        </div>
        {entity.tagline && (
          <div className="text-[11.5px] text-zinc-500 truncate">{entity.tagline}</div>
        )}
      </div>
      {selected && <Check size={12} weight="bold" className="text-blue-400 shrink-0" />}
    </button>
  )
}
