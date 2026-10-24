'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { DeviceMobile, Desktop, DeviceTablet, Key, EnvelopeSimple, CheckCircle, Circle } from '@phosphor-icons/react'
import { DsrtPage, DsrtSection, DsrtPanel, DsrtButton } from '@/components/dsrt'

interface SessionRow {
  id: string
  device_name: string
  device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  city?: string
  country?: string
  is_current: boolean
  last_active_at: string
  created_at: string
}

export function SecurityDashboard({
  profile,
  securityEvents,
  initialMfaState,
  pinConfigured = false,
  pinUpdatedAt = null,
  pinLastUsed = null,
}: any) {
  const router = useRouter()
  const supabase = createClient()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revoking, setRevoking] = useState(false)
  const [requestingVerification, setRequestingVerification] = useState(false)
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaState)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [enrollingMfa, setEnrollingMfa] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)

  const [pinActive, setPinActive] = useState<boolean>(!!pinConfigured)
  const [pinMode, setPinMode] = useState<'view' | 'set' | 'change'>('view')
  const [pinCurrent, setPinCurrent] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinSaving, setPinSaving] = useState(false)

  useEffect(() => { loadSessions() }, [])
  useEffect(() => { setPinActive(!!pinConfigured) }, [pinConfigured])

  const resetPinForm = () => {
    setPinCurrent('')
    setPinNew('')
    setPinConfirm('')
    setPinMode('view')
  }

  const submitPin = async () => {
    if (pinSaving) return
    setPinSaving(true)
    try {
      if (pinMode === 'change') {
        const res = await fetch('/api/auth/pin/change', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPin: pinCurrent, newPin: pinNew, confirmPin: pinConfirm }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not update PIN')
        toast.success('PIN updated')
      } else {
        const res = await fetch('/api/auth/pin/set', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinNew, confirmPin: pinConfirm }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Could not set PIN')
        toast.success('PIN set')
      }
      setPinActive(true)
      resetPinForm()
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Something went wrong')
    } finally {
      setPinSaving(false)
    }
  }

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const res = await fetch('/api/auth/sessions')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {
      setSessions([])
    } finally {
      setLoadingSessions(false)
    }
  }

  const revokeSession = async (id: string) => {
    try {
      const res = await fetch(`/api/auth/sessions?session_id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('Session revoked')
      loadSessions()
    } catch {
      toast.error('Failed to revoke session')
    }
  }

  const revokeAllOthers = async () => {
    setRevoking(true)
    try {
      const res = await fetch('/api/auth/sessions?scope=all_others', { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('All other sessions revoked')
      loadSessions()
    } catch {
      toast.error('Failed to revoke sessions')
    } finally {
      setRevoking(false)
    }
  }

  const requestVerification = async () => {
    setRequestingVerification(true)
    try {
      const res = await fetch('/api/auth/request-verification', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Verification email queued')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to request verification')
    } finally {
      setRequestingVerification(false)
    }
  }

  const startMfaEnrollment = async () => {
    setEnrollingMfa(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'DSRT Connect',
        friendlyName: `DSRT · ${profile.username}`,
      })
      if (error) throw error
      setQrCode(data.totp.qr_code)
      setFactorId(data.id)
    } catch (err: any) {
      toast.error(err.message || 'Failed to start MFA setup')
    } finally {
      setEnrollingMfa(false)
    }
  }

  const verifyMfa = async () => {
    if (!factorId || mfaCode.length !== 6) return toast.error('Enter a 6-digit code')
    setEnrollingMfa(true)
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId })
      if (challenge.error) throw challenge.error
      const verify = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code: mfaCode })
      if (verify.error) throw verify.error
      const res = await fetch('/api/auth/mfa/finalize', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMfaEnabled(true)
      setRecoveryCodes(data.recoveryCodes)
      setQrCode(null)
      setMfaCode('')
      toast.success('Two-factor authentication enabled')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'MFA verification failed')
    } finally {
      setEnrollingMfa(false)
    }
  }

  const downloadCodes = () => {
    if (!recoveryCodes) return
    const content = `DSRT CONNECT RECOVERY CODES\n\nAccount: @${profile.username}\nGenerated: ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n\nKeep these codes secure. Each can be used once.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dsrt-recovery-${profile.username}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isVerified = profile?.email_verification_status === 'VERIFIED'
  const trustLevel = profile?.trust_level || 'NEW'
  const trustScore = profile?.trust_score || 0

  const deviceIcon = (type: string) => {
    if (type === 'mobile') return DeviceMobile
    if (type === 'tablet') return DeviceTablet
    return Desktop
  }

  return (
    <DsrtPage width="narrow" className="space-y-4 py-6 sm:py-8">
      <DsrtSection
        title="Security"
        description="Manage identity, trust, and access to your DSRT account."
        headerVariant="large"
      />

      {/* Trust Overview */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">Trust Level</p>
            <p className="text-[16px] sm:text-[18px] font-bold text-white mt-1">{trustLevel}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">Score</p>
            <p className="text-[16px] sm:text-[18px] font-mono font-bold text-[#93c5fd] mt-1">
              {trustScore}
              <span className="text-white/30 text-[12px]">/100</span>
            </p>
          </div>
        </div>
        <div className="px-4 sm:px-5 py-4">
          <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#1e3a5f] to-[#2c5282] transition-all duration-500" style={{ width: `${trustScore}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-white/30 uppercase tracking-wider font-mono font-bold">
            <span>New</span>
            <span>Established</span>
            <span>Verified</span>
            <span>Trusted</span>
          </div>
        </div>
      </DsrtPanel>

      {/* Email Verification */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-4">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border',
            isVerified ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-white/50'
          )}>
            {isVerified ? <CheckCircle className="w-4 h-4" weight="fill" /> : <EnvelopeSimple className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">Email verification</p>
            <p className="text-[12px] text-white/50 mt-0.5 truncate">
              {isVerified ? `Verified · ${profile.email}` : `Not verified · ${profile.email}`}
            </p>
          </div>
          {!isVerified && (
            <DsrtButton size="xs" variant="primary" loading={requestingVerification} onClick={requestVerification}>
              Verify
            </DsrtButton>
          )}
        </div>
      </DsrtPanel>

      {/* 2FA */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-4">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border',
            mfaEnabled ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-white/50'
          )}>
            <Key className="w-4 h-4" weight={mfaEnabled ? 'fill' : 'regular'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">Two-factor authentication</p>
            <p className="text-[12px] text-white/50 mt-0.5">
              {mfaEnabled ? 'Enabled with authenticator app' : 'Adds an extra layer of security'}
            </p>
          </div>
          {!mfaEnabled && !qrCode && (
            <DsrtButton size="xs" variant="outline" onClick={startMfaEnrollment} loading={enrollingMfa}>
              Enable
            </DsrtButton>
          )}
          {mfaEnabled && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold shrink-0">Active</span>
          )}
        </div>

        {qrCode && !mfaEnabled && (
          <div className="border-t border-white/[0.06] px-4 sm:px-5 py-5">
            <p className="text-[12px] text-white/60 mb-4">
              Scan with Google Authenticator, 1Password, or Authy, then enter the 6-digit code.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start">
              <div className="bg-white p-2 rounded-md flex-shrink-0">
                <img src={qrCode} alt="MFA QR" className="w-32 h-32" />
              </div>
              <div className="flex-1 flex flex-col gap-2 w-full">
                <input
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white font-mono text-[15px] tracking-widest text-center sm:text-left focus:outline-none focus:border-[#2c5282]"
                />
                <DsrtButton variant="primary" onClick={verifyMfa} loading={enrollingMfa} disabled={mfaCode.length !== 6}>
                  Verify & Enable
                </DsrtButton>
              </div>
            </div>
          </div>
        )}

        {recoveryCodes && (
          <div className="border-t border-white/[0.06] px-4 sm:px-5 py-5 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] font-bold text-emerald-400">Save your recovery codes</p>
              <button onClick={downloadCodes} className="text-[11px] font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors">
                Download
              </button>
            </div>
            <p className="text-[11px] text-white/50 mb-3">Shown only once. Each can be used once if you lose your device.</p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px]">
              {recoveryCodes.map((c, i) => (
                <div key={i} className="px-2.5 py-1.5 rounded bg-black/40 border border-white/[0.06] text-white/80">
                  {c}
                </div>
              ))}
            </div>
          </div>
        )}
      </DsrtPanel>

      {/* DSRT PIN */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex items-center gap-4">
          <div className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border',
            pinActive ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-white/50'
          )}>
            <Key className="w-4 h-4" weight={pinActive ? 'fill' : 'regular'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-white">DSRT PIN</p>
            <p className="text-[12px] text-white/50 mt-0.5 truncate">
              {pinActive
                ? `Active${pinUpdatedAt ? ` · Updated ${new Date(pinUpdatedAt).toLocaleDateString()}` : ''}`
                : '6-digit PIN as a faster alternative to your password'}
            </p>
          </div>
          {pinMode === 'view' && (
            <DsrtButton size="xs" variant="outline" onClick={() => setPinMode(pinActive ? 'change' : 'set')}>
              {pinActive ? 'Change' : 'Set PIN'}
            </DsrtButton>
          )}
        </div>

        {pinMode !== 'view' && (
          <div className="border-t border-white/[0.06] px-4 sm:px-5 py-5 space-y-3">
            {pinMode === 'change' && (
              <input
                type="password" inputMode="numeric" maxLength={6}
                value={pinCurrent} onChange={(e) => setPinCurrent(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Current PIN"
                className="w-full sm:max-w-[240px] h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white font-mono text-[15px] tracking-widest text-center focus:outline-none focus:border-[#2c5282]"
              />
            )}
            <input
              type="password" inputMode="numeric" maxLength={6}
              value={pinNew} onChange={(e) => setPinNew(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="New PIN"
              className="w-full sm:max-w-[240px] h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white font-mono text-[15px] tracking-widest text-center focus:outline-none focus:border-[#2c5282]"
            />
            <input
              type="password" inputMode="numeric" maxLength={6}
              value={pinConfirm} onChange={(e) => setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Confirm new PIN"
              className="w-full sm:max-w-[240px] h-10 px-3 rounded-lg bg-white/[0.03] border border-white/[0.1] text-white font-mono text-[15px] tracking-widest text-center focus:outline-none focus:border-[#2c5282]"
            />
            <div className="flex items-center gap-2 pt-1">
              <DsrtButton size="sm" variant="primary" onClick={submitPin} loading={pinSaving}>
                {pinMode === 'change' ? 'Update PIN' : 'Set PIN'}
              </DsrtButton>
              <DsrtButton size="sm" variant="ghost" onClick={resetPinForm} disabled={pinSaving}>
                Cancel
              </DsrtButton>
            </div>
          </div>
        )}
      </DsrtPanel>

      {/* Active Sessions */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-white">Active sessions</p>
            <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-0.5">Devices signed in</p>
          </div>
          {sessions.filter((s) => !s.is_current).length > 0 && (
            <button
              onClick={revokeAllOthers}
              disabled={revoking}
              className="h-8 px-3 rounded-lg text-[11px] font-bold text-red-400 hover:bg-red-500/10 border border-red-500/25 transition-all whitespace-nowrap"
            >
              Sign out others
            </button>
          )}
        </div>
        <div className="divide-y divide-white/[0.04]">
          {loadingSessions ? (
            <div className="px-5 py-6 text-[12px] text-white/40 text-center">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="px-5 py-6 text-[12px] text-white/40 text-center">No sessions tracked yet</div>
          ) : (
            sessions.map((s) => {
              const Icon = deviceIcon(s.device_type)
              return (
                <div key={s.id} className="px-4 sm:px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                  <Icon className="w-4 h-4 text-white/40 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] text-white font-medium truncate">{s.device_name}</p>
                      {s.is_current && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider font-bold font-mono shrink-0">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/40 mt-0.5 truncate">
                      {s.city && s.country ? `${s.city}, ${s.country} · ` : ''}
                      Active {formatDistanceToNow(new Date(s.last_active_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!s.is_current && (
                    <button onClick={() => revokeSession(s.id)} className="text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-red-400 transition-colors shrink-0">
                      Revoke
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </DsrtPanel>

      {/* Security Activity */}
      <DsrtPanel padding="none" className="overflow-hidden">
        <div className="px-4 sm:px-5 py-4 border-b border-white/[0.06]">
          <p className="text-[13px] font-bold text-white">Security activity</p>
          <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mt-0.5">Recent events on your account</p>
        </div>
        <div className="divide-y divide-white/[0.04] max-h-80 overflow-y-auto">
          {!securityEvents || securityEvents.length === 0 ? (
            <div className="px-5 py-6 text-[12px] text-white/40 text-center">No security events yet</div>
          ) : (
            securityEvents.slice(0, 15).map((e: any) => (
              <div key={e.id} className="px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                <Circle className={cn('w-2 h-2 flex-shrink-0', e.success ? 'text-emerald-400' : 'text-red-400')} weight="fill" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-white/90 font-medium capitalize truncate">
                    {e.event_type.replace(/_/g, ' ').toLowerCase()}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-white/40 mt-0.5">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </DsrtPanel>
    </DsrtPage>
  )
}