'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeSlash, Envelope, Lock, ArrowRight } from '@phosphor-icons/react'
import { DsrtLogo } from '@/components/ui/DsrtLogo'

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // TODO: wire your auth here
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <div className="w-full max-w-md">
      {/* Card wrapper — visible on desktop, transparent on mobile */}
      <div className="lg:rounded-2xl lg:border lg:border-white/[0.08] lg:bg-white/[0.02] lg:backdrop-blur-md lg:p-8 lg:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        
        {/* Desktop-only mini logo above form */}
        <div className="hidden lg:flex flex-col items-center mb-6">
          <DsrtLogo size={36} showText={false} />
          <h2 className="mt-4 text-[22px] font-bold text-white">Sign in to DSRT</h2>
          <p className="mt-1 text-[13px] text-white/50">Access your workspace and continue.</p>
        </div>

        {/* Social auth buttons */}
        <div className="space-y-2.5">
          <SocialButton provider="x" label="Continue with X" />
          <SocialButton provider="google" label="Continue with Google" />
          <SocialButton provider="linkedin" label="Continue with LinkedIn" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[12px] text-white/40 font-medium">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Email
            </label>
            <div className="relative">
              <Envelope size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-11 rounded-lg bg-black/40 border border-white/10 pl-10 pr-4 text-[14px] text-white placeholder:text-white/30 focus:border-[#4F7CFF]/60 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-[11px] font-mono font-bold uppercase tracking-wider text-white/60 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full h-11 rounded-lg bg-black/40 border border-white/10 pl-10 pr-11 text-[14px] text-white placeholder:text-white/30 focus:border-[#4F7CFF]/60 focus:bg-black/60 focus:outline-none focus:ring-2 focus:ring-[#4F7CFF]/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember + Forgot — desktop only, hidden on mobile per your mock */}
          <div className="hidden lg:flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-black/40 accent-[#4F7CFF] cursor-pointer"
              />
              <span className="text-[13px] text-white/60 group-hover:text-white/80 transition-colors">
                Remember me
              </span>
            </label>
            <Link
              href="/forgot-password"
              className="text-[13px] text-[#4F7CFF] hover:text-[#7B9AFF] font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          {/* Primary submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-lg bg-[#4F7CFF] hover:bg-[#3D6BF5] active:bg-[#3057E8] text-white text-[14px] font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-[0_4px_20px_-4px_rgba(79,124,255,0.5)]"
          >
            {loading ? 'Signing in…' : (
              <>
                Sign in to DSRT
                <ArrowRight size={16} weight="bold" />
              </>
            )}
          </button>

          {/* Mobile-only Create account CTA */}
          <p className="lg:hidden text-center text-[13px] text-white/50 pt-2">
            New to DSRT?{' '}
            <Link href="/signup" className="text-[#4F7CFF] hover:text-[#7B9AFF] font-semibold transition-colors">
              Create account
            </Link>
          </p>

          {/* Mobile-only forgot password */}
          <p className="lg:hidden text-center">
            <Link
              href="/forgot-password"
              className="text-[12px] text-white/40 hover:text-white/70 font-medium transition-colors"
            >
              Forgot password?
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

/* ---------- Social button ---------- */

function SocialButton({ provider, label }: { provider: 'x' | 'google' | 'linkedin'; label: string }) {
  return (
    <button
      type="button"
      className="w-full h-11 rounded-lg border border-white/10 bg-black/30 hover:bg-black/50 hover:border-white/20 text-white text-[14px] font-medium transition-all flex items-center gap-3 px-4"
    >
      <span className="w-6 h-6 flex items-center justify-center shrink-0">
        {provider === 'x' && <XIcon />}
        {provider === 'google' && <GoogleIcon />}
        {provider === 'linkedin' && <LinkedInIcon />}
      </span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  )
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#EA4335" d="M12 5c1.617 0 3.101.554 4.286 1.474l3.207-3.207C17.507 1.393 14.898 0 12 0 7.31 0 3.257 2.69 1.28 6.61l3.739 2.9C5.958 6.717 8.735 5 12 5z" />
      <path fill="#4285F4" d="M23.49 12.275c0-.815-.075-1.6-.215-2.35H12v4.45h6.44a5.501 5.501 0 01-2.386 3.62l3.65 2.83c2.13-1.97 3.786-4.865 3.786-8.55z" />
      <path fill="#FBBC05" d="M5.02 14.51A7.02 7.02 0 014.65 12c0-.87.14-1.71.37-2.51L1.28 6.59A11.995 11.995 0 000 12c0 1.94.464 3.77 1.28 5.41l3.74-2.9z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.65-2.83c-1.01.68-2.31 1.09-4.29 1.09-3.265 0-6.042-1.717-7.023-4.51l-3.739 2.9C3.257 21.31 7.31 24 12 24z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <rect width="24" height="24" rx="3" fill="#0A66C2" />
      <path
        fill="white"
        d="M7.5 9.5H4.75V18.5H7.5V9.5zM6.125 8.375A1.625 1.625 0 106.125 5.125a1.625 1.625 0 000 3.25zM19.25 18.5H16.5V13.875c0-1.104-.02-2.525-1.538-2.525-1.54 0-1.775 1.202-1.775 2.444V18.5H10.44V9.5h2.638v1.235h.037c.367-.696 1.264-1.43 2.6-1.43 2.783 0 3.535 1.834 3.535 4.22V18.5z"
      />
    </svg>
  )
}