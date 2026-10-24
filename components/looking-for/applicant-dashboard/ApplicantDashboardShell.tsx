'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MagnifyingGlass, CaretDown } from '@phosphor-icons/react'
import { useState, useRef, useEffect } from 'react'
import { DsrtPage, DsrtSection, DsrtButton, DsrtInput, DsrtTabs } from '@/components/dsrt'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'offers', label: 'Offers' },
  { value: 'completed', label: 'Completed' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'drafts', label: 'Drafts' },
]

const SORT_OPTIONS = [
  { key: 'recent_activity', label: 'Recent activity' },
  { key: 'recently_applied', label: 'Recently applied' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'title', label: 'Opportunity name' },
]

export function ApplicantDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const sp = useSearchParams()
  const filter = sp.get('filter') || 'all'
  const sort = sp.get('sort') || 'recent_activity'
  const search = sp.get('search') || ''

  const [q, setQ] = useState(search)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams(sp.toString())
      if (q) p.set('search', q)
      else p.delete('search')
      router.replace(`/looking-for/my-applications?${p.toString()}`, { scroll: false })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const setFilter = (f: string) => {
    const p = new URLSearchParams(sp.toString())
    if (f === 'all') p.delete('filter')
    else p.set('filter', f)
    router.replace(`/looking-for/my-applications?${p.toString()}`, { scroll: false })
  }

  const setSort = (s: string) => {
    const p = new URLSearchParams(sp.toString())
    if (s === 'recent_activity') p.delete('sort')
    else p.set('sort', s)
    router.replace(`/looking-for/my-applications?${p.toString()}`, { scroll: false })
  }

  return (
    <DsrtPage width="default" className="space-y-6">
      <DsrtSection
        title="My Applications"
        description="Track every opportunity you've applied to and follow their status."
        headerVariant="large"
        actions={
          <DsrtButton asChild size="sm" variant="white">
            <Link href="/looking-for">Browse Opportunities</Link>
          </DsrtButton>
        }
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 max-w-lg">
          <DsrtInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search applications..."
            icon={<MagnifyingGlass size={14} />}
            sizeVariant="md"
          />
        </div>
        <SortDropdown value={sort} onChange={setSort} />
      </div>

      <div className="sticky top-[130px] z-20 bg-[#05070D]/95 backdrop-blur-md -mx-4 px-4 sm:mx-0 sm:px-0 py-1">
        <DsrtTabs
          variant="underline"
          tabs={FILTERS}
          activeValue={filter}
          onValueChange={setFilter}
        />
      </div>

      {children}
    </DsrtPage>
  )
}

function SortDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const current = SORT_OPTIONS.find((o) => o.key === value)?.label || 'Recent activity'

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] text-[12.5px] font-medium text-white/70 hover:text-white transition-colors w-full sm:w-auto justify-between"
      >
        {current}
        <CaretDown size={11} weight="bold" className="text-white/40" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/[0.1] bg-[#0a0f1a] shadow-2xl z-30 py-1">
          {SORT_OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                onChange(o.key)
                setOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-[12.5px] transition-colors',
                value === o.key
                  ? 'bg-white/[0.06] text-white font-semibold'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}