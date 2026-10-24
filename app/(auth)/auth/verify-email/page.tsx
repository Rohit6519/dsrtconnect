import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { VerifyEmailScreen } from '@/components/auth/VerifyEmailScreen'
import { AuthShellFrame } from '@/components/auth/AuthShellFrame'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Verify email — DSRT' }

export default async function VerifyEmailPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <AuthShellFrame>
      <VerifyEmailScreen email={user.email || ''} />
    </AuthShellFrame>
  )
}