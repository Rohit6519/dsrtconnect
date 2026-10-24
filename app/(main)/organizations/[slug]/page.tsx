import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OrganizationPage } from '@/components/organizations/OrganizationPage'
import { DsrtPage } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!org) notFound()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: membership } = await supabase
    .from('organization_members')
    .select('role, status, verified')
    .eq('organization_id', org.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'
  const isModerator = membership?.role === 'moderator'

  return (
    <DsrtPage width="wide" padding="none" className="min-h-screen pb-12">
      <OrganizationPage
        organization={org}
        currentUser={profile}
        membership={membership}
        permissions={{
          is_member: !!membership && membership.status === 'active',
          is_admin: isAdmin,
          is_moderator: isModerator || isAdmin,
          can_edit: isAdmin,
          can_moderate: isAdmin || isModerator,
          can_invite: isAdmin || isModerator,
          can_post_resource: !!membership && membership.status === 'active',
          can_post_discussion: !!membership && membership.status === 'active',
        }}
      />
    </DsrtPage>
  )
}