import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvitationsPage } from '@/components/invitations/InvitationsPage'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return <InvitationsPage currentUser={profile} />
}