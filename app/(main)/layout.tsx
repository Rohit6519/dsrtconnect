import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MainClientProviders } from '@/components/layout/MainClientProviders'
import { AppShell } from '@/components/layout/AppShell'

export const dynamic = 'force-dynamic'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  let { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    const email = user.email || ''
    const usernameBase = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '')
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || usernameBase

    const { data: newProfile } = await supabase
      .from('users')
      .upsert(
        { id: user.id, email, full_name: fullName, username: usernameBase, onboarding_complete: true },
        { onConflict: 'id' }
      )
      .select('*')
      .single()

    profile = newProfile || { id: user.id, email, full_name: fullName, username: usernameBase, onboarding_complete: true }
  }

  return (
    <MainClientProviders>
      <AppShell user={profile}>
        {children}
      </AppShell>
    </MainClientProviders>
  )
}