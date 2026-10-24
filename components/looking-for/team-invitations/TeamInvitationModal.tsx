'use client'

import { useEffect, useState, useRef } from 'react'
import {
  X, CircleNotch, Rocket, FolderSimple, PaperPlaneTilt,
  CalendarBlank, CheckCircle, Warning,
} from '@phosphor-icons/react'

interface Props {
  isOpen: boolean
  applicationId: string
  opportunityId: string
  applicantName: string
  onClose: () => void
  onSuccess: () => void
}

export function TeamInvitationModal({
  isOpen,
  applicationId,
  opportunityId,
  applicantName,
  onClose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Destination options
  const [destinations, setDestinations] = useState<any[]>([])
  const [selectedDest, setSelectedDest] = useState<{ type: string; id: string; name: string } | null>(null)

  // Form fields
  const [role, setRole] = useState('')
  const [message, setMessage] = useState('')
  const [startDate, setStartDate] = useState('')

  // Load destinations from the opportunity's linked project/venture
  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    setSuccess(false)

    ;(async () => {
      try {
        const res = await fetch(`/api/opportunities/${opportunityId}`)
        const d = await res.json()
        if (!res.ok) throw new Error(d?.error || 'Failed to load')

        const dests: any[] = []

        if (d.project_id) {
          const pRes = await fetch(`/api/projects/${d.project_id}?fields=id,name,slug,icon`)
            .catch(() => null)
          if (pRes?.ok) {
            const p = await pRes.json()
            if (p?.id) dests.push({ type: 'project', id: p.id, name: p.name, icon: p.icon, slug: p.slug })
          }
        }

        if (d.venture_id) {
          const vRes = await fetch(`/api/ventures/${d.venture_id}?fields=id,name,slug,logo_url`)
            .catch(() => null)
          if (vRes?.ok) {
            const v = await vRes.json()
            if (v?.id) dests.push({ type: 'venture', id: v.id, name: v.name, logo_url: v.logo_url, slug: v.slug })
          }
        }

        // Fallback: fetch from distribution targets (user's own projects/ventures)
        if (dests.length === 0) {
          const tRes = await fetch('/api/opportunities/dashboard/distribution-targets')
          const t = await tRes.json()
          for (const p of (t.projects || [])) dests.push({ type: 'project', id: p.id, name: p.name, icon: p.icon })
          for (const v of (t.ventures || [])) dests.push({ type: 'venture', id: v.id, name: v.name, logo_url: v.logo_url })
        }

        setDestinations(dests)
        if (dests.length === 1) {
          setSelectedDest({ type: dests[0].type, id: dests[0].id, name: dests[0].name })
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load destinations')
      } finally {
        setLoading(false)
      }
    })()
  }, [isOpen, opportunityId])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleSend = async () => {
    if (!selectedDest) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/team-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          destination_type: selectedDest.type,
          destination_id: selectedDest.id,
          role: role.trim() || 'Team Member',
          start_date: startDate || null,
          message: message.trim() || null,
        }),
      })

      const d = await res.json()

      if (res.status === 409) {
        setError(d.error || 'A pending invitation already exists.')
        setSending(false)
        return
      }

      if (!res.ok) throw new Error(d?.error || 'Failed to send invitation')

      setSuccess(true)
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (e: any) {
      setError(e?.message || 'Failed to send invitation')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !sending && onClose()}
      />

      <div
        className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#0c0d10] shadow-[0_20px_80px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/50">
          <div className="flex items-center gap-2">
            <PaperPlaneTilt size={18} className="text-blue-400" />
            <h2 className="text-[15px] font-bold text-white">Invite to Team</h2>
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors disabled:opacity-50"
          >
            <X size={15} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle size={28} weight="fill" />
              </div>
              <div className="text-center">
                <h3 className="text-[16px] font-bold text-white mb-1">Invitation Sent</h3>
                <p className="text-[13px] text-zinc-400">
                  {applicantName} will receive your invitation via DSRT Mail.
                </p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center py-10">
              <CircleNotch size={24} className="text-zinc-600 animate-spin mb-3" />
              <p className="text-[13px] text-zinc-500">Loading team options...</p>
            </div>
          ) : (
            <>
              {/* Applicant Context */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Inviting</div>
                <div className="text-[15px] font-bold text-white">{applicantName}</div>
              </div>

              {/* Destination Picker */}
              <div>
                <label className="block text-[12px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Invite to
                </label>

                {destinations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center">
                    <Warning size={20} className="mx-auto mb-2 text-amber-400" />
                    <p className="text-[13px] text-zinc-400 mb-1">No linked project or venture found.</p>
                    <p className="text-[11.5px] text-zinc-500">Connect a project or venture to this opportunity first.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {destinations.map((d) => {
                      const isSelected = selectedDest?.id === d.id
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedDest({ type: d.type, id: d.id, name: d.name })}
                          className={
                            'w-full flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ' +
                            (isSelected
                              ? 'border-blue-500/50 bg-blue-500/10'
                              : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700')
                          }
                        >
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                            {d.type === 'project' ? (
                              d.icon ? <span className="text-lg">{d.icon}</span> : <FolderSimple size={18} className="text-zinc-500" />
                            ) : (
                              d.logo_url ? <img src={d.logo_url} className="w-full h-full rounded-lg object-cover" alt="" /> : <Rocket size={18} className="text-zinc-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-bold text-white truncate">{d.name}</div>
                            <div className="text-[11px] text-zinc-500 capitalize">{d.type}</div>
                          </div>
                          {isSelected && <CheckCircle size={18} weight="fill" className="text-blue-400 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Role Input */}
              {selectedDest && (
                <>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Team Role
                    </label>
                    <input
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      placeholder="e.g. Machine Learning Engineer"
                      className="w-full h-11 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Start Date (Optional)
                    </label>
                    <div className="relative">
                      <CalendarBlank size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-600"
                      />
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                      Personal Message (Optional)
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={`Welcome ${applicantName.split(' ')[0]} to the team...`}
                      rows={3}
                      className="w-full p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none leading-relaxed"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-start gap-2 p-3.5 rounded-xl border border-red-500/25 bg-red-500/[0.05] text-[12.5px] text-red-300">
                  <Warning size={16} weight="fill" className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && !loading && destinations.length > 0 && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-800/80 bg-[#090a0c]">
            <button
              onClick={onClose}
              disabled={sending}
              className="h-10 px-4 rounded-xl border border-zinc-800 hover:border-zinc-700 text-[13px] font-semibold text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !selectedDest}
              className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-[13px] font-bold transition-all disabled:opacity-60 shadow-[0_2px_12px_rgba(255,255,255,0.15)]"
            >
              {sending ? (
                <>
                  <CircleNotch size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <PaperPlaneTilt size={14} weight="bold" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}