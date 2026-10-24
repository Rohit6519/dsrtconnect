// filepath: components/auth/SignupForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EnvelopeSimple, CircleNotch, ArrowRight, User } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { AuthInput } from './AuthInput'
import { PasswordInput } from './PasswordInput'
import { OAuthButton } from './OAuthButton'
import { AuthDivider } from './AuthDivider'
import { GoogleIcon, GithubIcon } from './ProviderIcons'
import { cn } from '@/lib/utils'
import type { AuthView } from './AuthShell'

interface Props {
  onSwitchView: (view: AuthView) => void
  onVerify?: (email: string) => void
}

export function SignUpForm({ onSwitchView }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/callback?next=/auth/username`,
        },
      })
      if (error) throw error
    } catch (err: any) {
      toast.error(err.message || `Failed to connect to ${provider}`)
      setOauthLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName || !email || !password) {
      return toast.error('Please fill in all required fields')
    }
    if (password.length < 8) {
      return toast.error('Password must be at least 8 characters')
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      toast.success("Account created! Let's claim your DSRT identity.")
      router.push('/auth/username')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account')
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Mobile title */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Join DSRT</h1>
        <p className="text-[14px] text-white/50 mt-1">Build what matters. Together.</p>
      </div>

      {/* Desktop title */}
      <div className="hidden lg:block text-center mb-8">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Create your account</h2>
        <p className="text-[13px] text-white/50 mt-1">Build. Connect. Ship.</p>
      </div>

      {/* OAuth — Google + GitHub only */}
      <div className="space-y-3">
        <OAuthButton
          provider="google"
          onClick={() => handleOAuth('google')}
          loading={oauthLoading === 'google'}
          disabled={!!oauthLoading}
          icon={<GoogleIcon />}
        >
          Sign up with Google
        </OAuthButton>

        <OAuthButton
          provider="github"
          onClick={() => handleOAuth('github')}
          loading={oauthLoading === 'github'}
          disabled={!!oauthLoading}
          icon={<GithubIcon />}
        >
          Sign up with GitHub
        </OAuthButton>
      </div>

      <AuthDivider label="or" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="Full Name"
          name="fullName"
          autoComplete="name"
          placeholder="Alex Doe"
          leading={<User className="w-[18px] h-[18px]" weight="regular" />}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <AuthInput
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@example.com"
          leading={<EnvelopeSimple className="w-[18px] h-[18px]" weight="regular" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full h-[46px] rounded-xl mt-2 flex items-center justify-center gap-2 transition-all',
            'bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white text-[14.5px] font-semibold',
            'shadow-[0_0_20px_rgba(79,124,255,0.3)]',
            'disabled:opacity-70 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <CircleNotch className="w-5 h-5 animate-spin" weight="bold" />
          ) : (
            <>
              Create account
              <ArrowRight className="w-4 h-4" weight="bold" />
            </>
          )}
        </button>
      </form>

      {/* Mobile-only CTA */}
      <p className="lg:hidden text-center text-[13.5px] text-white/50 font-medium mt-8">
        Already have an account?{' '}
        <button
          onClick={() => onSwitchView('signin')}
          className="text-[#4F7CFF] hover:text-[#7B9AFF] font-semibold transition-colors"
        >
          Sign in
        </button>
      </p>
    </div>
  )
}