'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { User, PuzzlePiece, Rocket, Buildings, CaretDown } from '@phosphor-icons/react'
import type { DraftState } from './useDraftEditor'

interface Props {
  draft: DraftState
  onClick: () => void
}

interface ContextData {
  label: string
  name?: string
  logo_url?: string | null
  icon?: string | null
  Icon: any
}

export function ContextIndicator({ draft, onClick }: Props) {
  const [entityName, setEntityName] = useState<string | null>(null)
  const [entityLogo, setEntityLogo] = useState<string | null>(null)
  const [entityIcon, setEntityIcon] = useState<string | null>(null)

  useEffect(() => {
    if (draft.context_type === 'personal') {
      setEntityName(null)
      return
    }

    let cancelled = false
    const load = async () => {
      try {
        const type =
          draft.context_type === 'project' ? 'project' :
          draft.context_type === 'venture' ? 'venture' :
          draft.context_type === 'organization' ? 'organization' : null

        const id = draft.project_id || draft.venture_id || draft.organization_id
        if (!type || !id) return

        const res = await fetch(`/api/looking-for/preview-context?type=${type}&id=${id}`).catch(() => null)
        if (!res) return
        const data = await res.json().catch(() => ({}))
        if (cancelled) return

        setEntityName(data?.entity?.name || null)
        setEntityLogo(data?.entity?.logo_url || null)
        setEntityIcon(data?.entity?.icon || null)
      } catch { /* ignore */ }
    }
    load()
    return () => { cancelled = true }
  }, [draft.context_type, draft.project_id, draft.venture_id, draft.organization_id])

  const meta: ContextData =
    draft.context_type === 'project' ? { label: 'Project', name: entityName || '...', logo_url: entityLogo, icon: entityIcon, Icon: PuzzlePiece } :
    draft.context_type === 'venture' ? { label: 'Venture', name: entityName || '...', logo_url: entityLogo, Icon: Rocket } :
    draft.context_type === 'organization' ? { label: 'Organization', name: entityName || '...', logo_url: entityLogo, Icon: Buildings } :
    { label: 'Personal', Icon: User }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 h-8 px-2.5 rounded-md border border-zinc-800 hover:border-zinc-600 bg-zinc-950 text-zinc-300 hover:text-white transition-colors group"
      title="Change posting context"
    >
      {meta.name && meta.logo_url ? (
        <div className="w-4 h-4 rounded-sm overflow-hidden bg-zinc-800 relative shrink-0">
          <Image src={meta.logo_url} alt="" fill className="object-cover" sizes="16px" />
        </div>
      ) : meta.name && meta.icon ? (
        <span className="text-[13px]">{meta.icon}</span>
      ) : (
        <meta.Icon size={12} weight="regular" />
      )}
      <span className="text-[11.5px]">
        <span className="text-zinc-500 uppercase tracking-wider">{meta.label}</span>
        {meta.name && (
          <>
            <span className="text-zinc-700 mx-1.5">/</span>
            <span className="text-zinc-200 font-medium">{meta.name}</span>
          </>
        )}
      </span>
      <CaretDown size={9} weight="bold" className="text-zinc-500 group-hover:text-zinc-300" />
    </button>
  )
}
