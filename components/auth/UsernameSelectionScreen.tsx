'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, CircleNotch, At, ArrowRight } from '@phosphor-icons/react'

export function UsernameSelectionScreen() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!username || username.length < 3) {
      setStatus('idle')
      return
    }

    setStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username/check?username=${encodeURIComponent(username)}`)
        const data = await res.json()

        if (data.available) {
          setStatus('available')
          setReason('')
        } else {
          setStatus('taken')
          setReason(data.reason || 'Username unavailable')
        }
      } catch (err) {
        setStatus('idle')
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [username])

  const handleClaim = async () => {
    if (status !== 'available') return
    setLoading(true)

    try {
      const res = await fetch('/api/auth/username/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      toast.success(`Welcome to DSRT, @${data.username}! Your DSRT Mail (${data.dsrt_email}) is ready.`)
      router.push('/onboarding')
    } catch (err: any) {
      toast.error(err.message || 'Failed to claim username')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-[400px] mx-auto text-left">
      <div className="text-center mb-6">
        <h1 className="text-[22px] font-bold text-white tracking-tight">Claim your DSRT username</h1>
        <p className="text-[13px] text-white/50 mt-1">This creates your permanent identity and DSRT Mail address.</p>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-semibold text-white/70 pl-1">Choose Username</label>
        <div className="relative flex items-center">
          <span className="absolute left-3.5 text-white/40 font-bold text-sm">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            placeholder="jisu"
            className="w-full h-11 pl-8 pr-10 rounded-lg bg-[#0A0D14] border border-white/10 text-white font-medium text-sm focus:outline-none focus:border-[#4F7CFF] focus:ring-1 focus:ring-[#4F7CFF] transition-all"
          />
          <div className="absolute right-3">
            {status === 'checking' && <CircleNotch className="w-4 h-4 animate-spin text-white/50" />}
            {status === 'available' && <CheckCircle className="w-5 h-5 text-emerald-400" weight="fill" />}
            {status === 'taken' && <XCircle className="w-5 h-5 text-rose-500" weight="fill" />}
          </div>
        </div>

        {/* Live Status Indicators */}
        {status === 'available' && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] flex items-center gap-2">
            <At className="w-4 h-4" weight="bold" />
            <span>Your official mail will be <strong>{username}@dsrtai.com</strong></span>
          </div>
        )}

        {status === 'taken' && (
          <p className="text-[12px] text-rose-400 pl-1">{reason}</p>
        )}
      </div>

      <button
        onClick={handleClaim}
        disabled={status !== 'available' || loading}
        className="w-full h-11 mt-6 rounded-lg bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(79,124,255,0.3)] transition-all disabled:opacity-50"
      >
        {loading ? <CircleNotch className="w-5 h-5 animate-spin" /> : <>Claim Username & Provision Mail <ArrowRight className="w-4 h-4" weight="bold" /></>}
      </button>
    </div>
  )
}