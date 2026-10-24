'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PipelineStagesCard } from './settings/PipelineStagesCard'
import { TeamMembersCard } from './settings/TeamMembersCard'
import { RecruitmentTemplatesPanel } from './settings/RecruitmentTemplatesPanel'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

export function SettingsTab({ opp, onRefresh }: { opp: any; onRefresh: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  // Modal states
  const [modalType, setModalType] = useState<'archive' | 'delete' | null>(null)
  const [isProcessingModal, setIsProcessingModal] = useState(false)

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const res = await fetch(`/api/opportunities/${opp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j?.error || 'Failed')
      }
      onRefresh()
    } finally {
      setBusy(false)
    }
  }

  const handleModalConfirm = async () => {
    setIsProcessingModal(true)
    try {
      if (modalType === 'archive') {
        await patch({ status: 'archived' })
      } else if (modalType === 'delete') {
        const res = await fetch(`/api/opportunities/${opp.id}`, { method: 'DELETE' })
        if (res.ok) router.push('/looking-for/my-opportunities/portfolio')
        else alert('Failed to delete')
      }
    } finally {
      setIsProcessingModal(false)
      setModalType(null)
    }
  }

  return (
    <>
      <div className="space-y-4 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Status">
            <div className="flex flex-wrap gap-2">
              {['active', 'paused', 'closed', 'filled', 'archived'].map((s) => (
                <button
                  key={s}
                  disabled={busy || opp.status === s}
                  onClick={() => patch({ status: s })}
                  className={
                    'h-9 px-3 rounded-xl border text-[12px] font-semibold capitalize transition-colors ' +
                    (opp.status === s
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Application controls">
            <Toggle
              label="Applications open"
              value={!!opp.applications_open}
              disabled={busy}
              onChange={(v: boolean) => patch({ applications_open: v })}
            />
            <Toggle
              label="Show applicant count publicly"
              value={opp.show_applicant_count !== false}
              disabled={busy}
              onChange={(v: boolean) => patch({ show_applicant_count: v })}
            />
            <Toggle
              label="Show compensation"
              value={opp.show_compensation !== false}
              disabled={busy}
              onChange={(v: boolean) => patch({ show_compensation: v })}
            />
            <Toggle
              label="Show location"
              value={opp.show_location !== false}
              disabled={busy}
              onChange={(v: boolean) => patch({ show_location: v })}
            />
          </Card>

          <Card title="Visibility">
            <div className="flex flex-wrap gap-2">
              {['public', 'unlisted', 'dsrt_only'].map((v) => (
                <button
                  key={v}
                  disabled={busy || opp.visibility === v}
                  onClick={() => patch({ visibility: v })}
                  className={
                    'h-9 px-3 rounded-xl border text-[12px] font-semibold capitalize transition-colors ' +
                    (opp.visibility === v
                      ? 'border-white/20 bg-white/10 text-white'
                      : 'border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600')
                  }
                >
                  {v.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Danger zone">
            <div className="space-y-3">
              <button
                disabled={busy}
                onClick={() => setModalType('archive')}
                className="h-10 px-5 rounded-xl border border-zinc-800 text-[12.5px] font-semibold text-zinc-300 hover:text-white hover:border-zinc-600 transition-colors"
              >
                Archive Opportunity
              </button>
              <button
                disabled={busy}
                onClick={() => setModalType('delete')}
                className="ml-3 h-10 px-5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-[12.5px] font-semibold hover:bg-red-500/20 transition-colors shadow-sm"
              >
                Delete Permanently
              </button>
            </div>
          </Card>
        </div>

        <PipelineStagesCard opportunityId={opp.id} />
        <TeamMembersCard opportunityId={opp.id} />
        <RecruitmentTemplatesPanel
          opportunityId={opp.id}
          opportunityTitle={opp.title}
        />
      </div>

      {/* DSRT Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={modalType !== null}
        title={modalType === 'delete' ? 'Delete Opportunity' : 'Archive Opportunity'}
        message={
          modalType === 'delete'
            ? `Are you sure you want to permanently delete "${opp.title}"? This will destroy all applications and analytics associated with it.`
            : `Are you sure you want to archive "${opp.title}"? It will be hidden from the public but preserved in your records.`
        }
        confirmText={modalType === 'delete' ? 'Yes, delete it' : 'Archive it'}
        isDestructive={modalType === 'delete'}
        isLoading={isProcessingModal}
        onConfirm={handleModalConfirm}
        onCancel={() => setModalType(null)}
      />
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-gradient-to-b from-[#18181b] via-[#121215] to-[#0f0f11] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="text-[13px] text-zinc-300">{label}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={
          'relative w-10 h-6 rounded-full transition-colors ' +
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