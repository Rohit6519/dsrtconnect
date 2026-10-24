'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus, MagnifyingGlass, CalendarBlank } from '@phosphor-icons/react'
import { DsrtSection, DsrtButton, DsrtInput, DsrtPanel } from '@/components/dsrt'
import { cn } from '@/lib/utils'

const RANGES = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'ytd', label: 'This year' },
]

export function MyOppsHeader() {
  const router = useRouter()
  const [range, setRange] = useState('30d')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [q, setQ] = useState('')

  return (
    <DsrtSection
      title="My Opportunities"
      description="Manage your opportunities, applications, and team hiring pipelines."
      headerVariant="large"
      actions={
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          {/* Search */}
          <div className="w-full sm:w-[220px]">
            <DsrtInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && q.trim()) {
                  router.push(
                    `/looking-for/my-opportunities/portfolio?q=${encodeURIComponent(
                      q.trim()
                    )}`
                  )
                }
              }}
              placeholder="Search opportunities…"
              icon={<MagnifyingGlass size={13} />}
              sizeVariant="md"
            />
          </div>

          {/* Date range dropdown */}
          <div className="relative shrink-0">
            <DsrtButton
              size="md"
              variant="outline"
              onClick={() => setRangeOpen(!rangeOpen)}
            >
              <CalendarBlank size={13} />
              <span className="hidden sm:inline">
                {RANGES.find((r) => r.key === range)?.label}
              </span>
              <span className="sm:hidden">{range.toUpperCase()}</span>
            </DsrtButton>

            {rangeOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setRangeOpen(false)}
                />
                <DsrtPanel
                  variant="raised"
                  padding="none"
                  className="absolute right-0 top-full mt-2 w-48 z-40 overflow-hidden shadow-2xl py-1"
                >
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => {
                        setRange(r.key)
                        setRangeOpen(false)
                        window.dispatchEvent(
                          new CustomEvent('myopps:range', { detail: r.key })
                        )
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-[12px] transition-colors',
                        range === r.key
                          ? 'bg-white/[0.08] text-white font-semibold'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                      )}
                    >
                      {r.label}
                    </button>
                  ))}
                </DsrtPanel>
              </>
            )}
          </div>

          {/* Create CTA */}
          <DsrtButton
            size="md"
            variant="white"
            onClick={() => router.push('/looking-for/create')}
            className="shrink-0"
          >
            <Plus size={13} weight="bold" />
            <span className="hidden sm:inline">Create Opportunity</span>
            <span className="sm:hidden">Create</span>
          </DsrtButton>
        </div>
      }
    />
  )
}