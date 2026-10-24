'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { QrCode, CheckCircle2, Loader2, X, Camera, RefreshCcw } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useEventAttendance } from '@/hooks/useEvents'
import { formatDistanceToNow } from 'date-fns'
import { DsrtPanel, DsrtInput, DsrtButton, DsrtGrid, DsrtSection, DsrtEmpty } from '@/components/dsrt'

interface Props { eventId: string }

export function LiveCheckinPanel({ eventId }: Props) {
  const [tokenInput, setTokenInput] = useState('')
  const [pending, startTransition] = useTransition()
  const [lastResult, setLastResult] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { items, reload } = useEventAttendance(eventId)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = (raw?: string) => {
    const t = (raw ?? tokenInput).trim()
    if (!t) return
    startTransition(async () => {
      const res = await fetch('/api/v1/events/checkin/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t, device_id: 'admin-desk' }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error?.message || 'Scan failed')
        setLastResult({ error: true, message: json?.error?.message })
      } else {
        const d = json?.data
        setLastResult(d)
        if (d.already_checked_in) toast.message(`Already checked in at ${new Date(d.checked_in_at).toLocaleTimeString()}`)
        else toast.success(`Checked in · #${d.registration_number || ''}`)
        reload()
      }
      setTokenInput('')
      inputRef.current?.focus()
    })
  }

  return (
    <DsrtGrid cols={{ base: 1, lg: 2 }} gap="lg">
      <DsrtPanel>
        <DsrtSection title="Manual Check-in" headerVariant="mono" className="mb-4" />
        <p className="text-[13px] text-white/60 mb-5 leading-relaxed">
          Focus the input and use a USB QR scanner, or manually paste a check-in token. Duplicate scans are ignored.
        </p>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <DsrtInput
              ref={inputRef}
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="Scan or paste token..."
              icon={<QrCode size={14} />}
            />
          </div>
          <DsrtButton variant="primary" loading={pending} onClick={() => submit()}>
            <Camera size={14} className="mr-1.5" /> Scan
          </DsrtButton>
        </div>

        {lastResult && !lastResult.error && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-[13px] font-bold text-emerald-100">
                {lastResult.already_checked_in ? 'Already checked in' : 'Checked in'} · #{lastResult.registration_number}
              </p>
              <p className="text-[10px] font-mono text-emerald-400/60 mt-0.5">
                {new Date(lastResult.checked_in_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
        {lastResult?.error && (
          <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
            <X className="w-5 h-5 text-red-400" />
            <p className="text-[13px] font-bold text-red-200">{lastResult.message || 'Scan failed'}</p>
          </div>
        )}
      </DsrtPanel>

      <DsrtPanel padding="none" className="overflow-hidden h-full flex flex-col max-h-[500px]">
        <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/50">Recent Scans ({items.length})</span>
          <DsrtButton size="xs" variant="ghost" onClick={reload}><RefreshCcw size={12} /></DsrtButton>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {items.length === 0 ? (
            <DsrtEmpty icon={QrCode} title="No scans yet" />
          ) : (
            items.slice(0, 50).map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04]">
                <CheckCircle2 className="w-4 h-4 text-[#93c5fd]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-white truncate">{a.user?.full_name || 'Anonymous'}</p>
                  <p className="text-[10px] font-mono text-white/40 mt-0.5">
                    {formatDistanceToNow(new Date(a.checked_in_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DsrtPanel>
    </DsrtGrid>
  )
}