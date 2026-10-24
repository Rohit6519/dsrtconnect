'use client'

import { useState, useEffect, useRef } from 'react'
import { CaretDown, FolderSimple, Rocket, UsersThree } from '@phosphor-icons/react'

interface Target {
  id: string
  name: string
  icon?: string
  image?: string
}

interface Props {
  onSelect: (type: string, id: string) => Promise<void>
  disabled?: boolean
}

export function DestinationPicker({ onSelect, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [targets, setTargets] = useState<{
    projects: Target[]
    ventures: Target[]
    communities: Target[]
  } | null>(null)
  const [tab, setTab] = useState<'project' | 'venture' | 'community'>('project')
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  useEffect(() => {
    if (open && !targets) {
      fetch('/api/opportunities/dashboard/distribution-targets')
        .then((r) => r.json())
        .then((d) => {
          setTargets({
            projects: (d.projects || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              icon: p.icon,
              image: p.cover_image_url,
            })),
            ventures: (d.ventures || []).map((v: any) => ({
              id: v.id,
              name: v.name,
              image: v.logo_url,
            })),
            communities: (d.communities || []).map((c: any) => ({
              id: c.id,
              name: c.name,
              image: c.cover_image,
            })),
          })
          if (d.projects?.length === 0 && d.ventures?.length > 0) setTab('venture')
          else if (
            d.projects?.length === 0 &&
            d.ventures?.length === 0 &&
            d.communities?.length > 0
          )
            setTab('community')
        })
        .catch(() => setTargets({ projects: [], ventures: [], communities: [] }))
    }
  }, [open, targets])

  const handlePick = async (id: string) => {
    setBusy(true)
    try {
      await onSelect(tab, id)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  const list =
    tab === 'project'
      ? targets?.projects || []
      : tab === 'venture'
        ? targets?.ventures || []
        : targets?.communities || []

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled || busy}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-800 hover:border-zinc-600 bg-zinc-950/50 text-[12px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
      >
        Add destination
        <CaretDown size={10} weight="bold" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[320px] rounded-xl border border-zinc-800 bg-[#0c0c0e] shadow-[0_12px_40px_rgba(0,0,0,0.6)] z-40 overflow-hidden flex flex-col">
          <div className="flex border-b border-zinc-800/80 bg-zinc-950/50 p-1 gap-1">
            <TabBtn
              active={tab === 'project'}
              onClick={() => setTab('project')}
              icon={<FolderSimple size={12} />}
              label="Projects"
            />
            <TabBtn
              active={tab === 'venture'}
              onClick={() => setTab('venture')}
              icon={<Rocket size={12} />}
              label="Ventures"
            />
            <TabBtn
              active={tab === 'community'}
              onClick={() => setTab('community')}
              icon={<UsersThree size={12} />}
              label="Communities"
            />
          </div>

          <div className="max-h-[260px] overflow-y-auto p-1.5">
            {!targets ? (
              <div className="p-4 text-center text-[11.5px] text-zinc-500">Loading...</div>
            ) : list.length === 0 ? (
              <div className="p-4 text-center text-[11.5px] text-zinc-500">
                No {tab}s found.
              </div>
            ) : (
              <ul className="space-y-0.5">
                {list.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => handlePick(t.id)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center text-[10px] shrink-0 text-zinc-500">
                        {t.image ? (
                          <img src={t.image} className="w-full h-full object-cover" alt="" />
                        ) : t.icon ? (
                          <span>{t.icon}</span>
                        ) : (
                          t.name.charAt(0)
                        )}
                      </div>
                      <span className="text-[12.5px] font-medium text-zinc-200 truncate">
                        {t.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={
        'flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-semibold transition-colors ' +
        (active
          ? 'bg-zinc-800 text-white shadow-sm'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50')
      }
    >
      {icon} {label}
    </button>
  )
}