// filepath: components/auth/SignInForm.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { EnvelopeSimple, CircleNotch, ArrowRight } from '@phosphor-icons/react'
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
}

export function SignInForm({ onSwitchView }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)

  const handleOAuth = async (provider: 'google' | 'github') => {
    setOauthLoading(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/callback?next=/home`,
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
    if (!email || !password) return toast.error('Please fill in all fields')

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      if (!data.user) throw new Error('Sign in failed')

      const { data: profile } = await supabase
        .from('users')
        .select('onboarding_complete')
        .eq('id', data.user.id)
        .maybeSingle()

      toast.success('Welcome back!')
      router.refresh()
      router.push(profile?.onboarding_complete ? '/home' : '/onboarding')
    } catch {
      toast.error('Incorrect email or password.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      {/* Mobile title */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-[28px] font-bold text-white tracking-tight">Welcome back</h1>
        <p className="text-[14px] text-white/50 mt-1">Continue where you left off.</p>
      </div>

      {/* Desktop title */}
      <div className="hidden lg:block text-center mb-8">
        <h2 className="text-[22px] font-bold text-white tracking-tight">Sign in to DSRT</h2>
        <p className="text-[13px] text-white/50 mt-1">Access your workspace and continue.</p>
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
          Continue with Google
        </OAuthButton>

        <OAuthButton
          provider="github"
          onClick={() => handleOAuth('github')}
          loading={oauthLoading === 'github'}
          disabled={!!oauthLoading}
          icon={<GithubIcon />}
        >
          Continue with GitHub
        </OAuthButton>
      </div>

      <AuthDivider label="or" />

      <form onSubmit={handleSubmit} className="space-y-4">
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
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between pt-1 pb-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-[15px] h-[15px] rounded-[4px] border-white/20 bg-white/[0.05] accent-[#4F7CFF] cursor-pointer"
            />
            <span className="text-[13px] text-white/50 group-hover:text-white/80 transition-colors">
              Remember me
            </span>
          </label>
          <button
            type="button"
            onClick={() => onSwitchView('forgot')}
            className="text-[13px] text-[#4F7CFF] hover:text-[#7B9AFF] font-medium transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={cn(
            'w-full h-[46px] rounded-xl flex items-center justify-center gap-2 transition-all',
            'bg-[#4F7CFF] hover:bg-[#3D6BF5] text-white text-[14.5px] font-semibold',
            'shadow-[0_0_20px_rgba(79,124,255,0.3)]',
            'disabled:opacity-70 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <CircleNotch className="w-5 h-5 animate-spin" weight="bold" />
          ) : (
            <>
              Sign in to DSRT
              <ArrowRight className="w-4 h-4" weight="bold" />
            </>
          )}
        </button>
      </form>

      {/* Mobile-only CTA */}
      <p className="lg:hidden text-center text-[13.5px] text-white/50 font-medium mt-8">
        New to DSRT?{' '}
        <button
          onClick={() => onSwitchView('signup')}
          className="text-[#4F7CFF] hover:text-[#7B9AFF] font-semibold transition-colors"
        >
          Create account
        </button>
      </p>
    </div>
  )
}