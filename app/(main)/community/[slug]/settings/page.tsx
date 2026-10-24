import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { CommunitySettings } from '@/components/communities/CommunitySettings'

export const dynamic = 'force-dynamic'

export default async function CommunitySettingsPage({ 
  params 
}: { 
  params: { slug: string } 
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: community, error } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (error || !community) {
    notFound()
  }

  const isCreator = community.created_by === user.id

  const { data: membership } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', community.id)
    .eq('user_id', user.id)
    .maybeSingle()

  const canManage = isCreator || 
    (membership && ['owner', 'admin'].includes(membership.role))

  if (!canManage) {
    redirect(`/community/${params.slug}`)
  }

  return <CommunitySettings community={community} currentUser={user} />
}