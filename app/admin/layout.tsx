import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (
    !profile?.admin_role ||
    !['dsrt_super_admin', 'dsrt_hackathon_admin', 'community_hackathon_admin'].includes(
      profile.admin_role
    )
  ) {
    redirect('/admin/login?error=unauthorized')
  }

  return <>{children}</>
}