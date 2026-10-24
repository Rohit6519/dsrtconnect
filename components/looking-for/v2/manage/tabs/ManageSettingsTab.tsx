'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ManageSettingsTab({
  opportunity,
  onRefresh,
}: {
  opportunity: any
  onRefresh: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      await fetch(`/api/opportunities/${opportunity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <Section title="Application controls">
        <Toggle
          label="Applications open"
          value={!!opportunity.applications_open}
          disabled={busy}
          onChange={(v: boolean) => patch({ applications_open: v })}
        />
        <Toggle
          label="Show applicant count publicly"
          value={opportunity.show_applicant_count !== false}
          disabled={busy}
          onChange={(v: boolean) => patch({ show_applicant_count: v })}
        />
        <Toggle
          label="Show compensation"
          value={opportunity.show_compensation !== false}
          disabled={busy}
          onChange={(v: boolean) => patch({ show_compensation: v })}
        />
      </Section>

      <Section title="Status">
        <div className="flex flex-wrap gap-2">
          {['active', 'paused', 'closed', 'filled', 'archived'].map((s) => (
            <button
              key={s}
              disabled={busy || opportunity.status === s}
              onClick={() => patch({ status: s })}
              className={
                'h-9 px-3 rounded-xl border text-[12px] font-semibold capitalize transition-colors ' +
                (opportunity.status === s
                  ? 'border-white/20 bg-white/10 text-white'
                  : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
              }
            >
              {s}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Danger zone">
        <button
          disabled={busy}
          onClick={async () => {
            if (!confirm('Delete permanently?')) return
            await fetch(`/api/opportunities/${opportunity.id}`, {
              method: 'DELETE',
            })
            router.push('/looking-for?tab=my-opportunities')
          }}
          className="h-9 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-[12.5px] font-semibold hover:bg-red-500/15"
        >
          Delete opportunity
        </button>
      </Section>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 p-5 bg-gradient-to-b from-[#18181b] to-[#0f0f11]">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-4">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-zinc-300">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={
          'w-10 h-6 rounded-full transition-colors relative ' +
          (value ? 'bg-white' : 'bg-zinc-800')
        }
      >
        <span
          className={
            'absolute top-0.5 w-5 h-5 rounded-full transition-all ' +
            (value ? 'left-4 bg-black' : 'left-0.5 bg-zinc-500')
          }
        />
      </button>
    </label>
  )
}