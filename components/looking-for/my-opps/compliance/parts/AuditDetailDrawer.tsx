'use client'

import { useEffect, useState } from 'react'
import { DrawerShell } from '@/components/looking-for/my-opps/command-center/parts/DrawerShell'
import { CircleNotch, CheckCircle, XCircle } from '@phosphor-icons/react'

export function AuditDetailDrawer({ entry, onClose }: { entry: any; onClose: () => void }) {
  const [detail, setDetail] = useState<any | null>(null)
  const [integrity, setIntegrity] = useState<any | null>(null)

  useEffect(() => {
    fetch(`/api/compliance/audit/${entry.id}`).then(r => r.json()).then(d => {
      setDetail(d.entry); setIntegrity(d.integrity)
    })
  }, [entry.id])

  return (
    <DrawerShell
      open onClose={onClose}
      title={entry.action}
      subtitle={`${entry.category} · seq ${entry.seq}`}
      wide
    >
      {!detail ? (
        <div className="flex items-center gap-2 text-[12px] text-zinc-500"><CircleNotch size={12} className="animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              {integrity?.ok
                ? <CheckCircle size={13} weight="fill" className="text-emerald-400" />
                : <XCircle size={13} weight="fill" className="text-red-400" />}
              <span className={'text-[11.5px] font-bold uppercase tracking-widest ' + (integrity?.ok ? 'text-emerald-300' : 'text-red-300')}>
                {integrity?.ok ? 'Integrity verified' : `Integrity failed: ${integrity?.reason || 'unknown'}`}
              </span>
            </div>
            <Kv k="Row hash" v={detail.row_hash} mono />
            <Kv k="Prev hash" v={detail.prev_hash} mono />
          </div>

          <Section title="Context">
            <Kv k="Actor" v={`${detail.actor_role} — ${detail.actor_id || 'system'}`} />
            <Kv k="Source" v={detail.source} />
            {detail.reason && <Kv k="Reason" v={detail.reason} />}
            {detail.actor_ip && <Kv k="IP" v={detail.actor_ip} mono />}
            {detail.actor_user_agent && <Kv k="User agent" v={detail.actor_user_agent} mono />}
          </Section>

          <Section title="Entity">
            <Kv k="Type" v={detail.entity_type} mono />
            <Kv k="ID" v={detail.entity_id} mono />
            {detail.opportunity_id && <Kv k="Opportunity" v={detail.opportunity_id} mono />}
            {detail.application_id && <Kv k="Application" v={detail.application_id} mono />}
          </Section>

          {detail.diff && (
            <Section title="Changed fields">
              <JsonBlock obj={detail.diff} />
            </Section>
          )}
          {detail.before_state && <Section title="Before"><JsonBlock obj={detail.before_state} /></Section>}
          {detail.after_state && <Section title="After"><JsonBlock obj={detail.after_state} /></Section>}
          {detail.metadata && Object.keys(detail.metadata).length > 0 && (
            <Section title="Metadata"><JsonBlock obj={detail.metadata} /></Section>
          )}
        </div>
      )}
    </DrawerShell>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">{title}</div>
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-1.5">{children}</div>
    </div>
  )
}
function Kv({ k, v, mono }: { k: string; v: any; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 text-[12.5px]">
      <span className="w-32 shrink-0 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">{k}</span>
      <span className={'text-zinc-200 break-all ' + (mono ? 'font-mono' : '')}>{String(v)}</span>
    </div>
  )
}
function JsonBlock({ obj }: { obj: any }) {
  return (
    <pre className="text-[11.5px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap max-h-[240px] overflow-y-auto">
      {JSON.stringify(obj, null, 2)}
    </pre>
  )
}