import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SavedPage } from '@/components/saved/SavedPage'
import { DsrtPage } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()

  return (
    <DsrtPage width="default">
      <SavedPage currentUser={profile} />
    </DsrtPage>
  )
}