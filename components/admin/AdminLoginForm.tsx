'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DsrtButton, DsrtInput } from '@/components/dsrt'

export function AdminLoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'unauthorized'
      ? 'You are not authorized to access the admin area.'
      : null
  )

  const handleLogin = async () => {
    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('users')
        .select('admin_role')
        .eq('id', data.user.id)
        .single()

      if (
        !profile?.admin_role ||
        !['dsrt_super_admin', 'dsrt_hackathon_admin', 'community_hackathon_admin'].includes(
          profile.admin_role
        )
      ) {
        setError('This account does not have admin access.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      router.push('/admin/hackathons')
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[13px] font-medium text-red-400">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="admin-email" className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">
          Admin Email
        </label>
        <DsrtInput
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@dsrtai.com"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="admin-password" className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/60">
          Password
        </label>
        <DsrtInput
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLogin()
          }}
        />
      </div>

      <div className="pt-2">
        <DsrtButton
          onClick={handleLogin}
          disabled={loading || !email || !password}
          loading={loading}
          variant="primary"
          fullWidth
          size="lg"
        >
          Access Admin Panel
        </DsrtButton>
      </div>
    </div>
  )
}