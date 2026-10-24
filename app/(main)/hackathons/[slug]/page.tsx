import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { HackathonView } from '@/components/hackathons/HackathonView'

interface PageProps {
  params: { slug: string }
}

export const dynamic = 'force-dynamic'

export default async function HackathonPage({ params }: PageProps) {
  const supabase = createClient()

  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('*, communities:community_id(id, name, slug), users:created_by(id, full_name, username, avatar_url, admin_role)')
    .eq('slug', params.slug)
    .eq('approved', true)
    .maybeSingle()

  if (!hackathon) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: registered }, { count: totalRegistered }] = await Promise.all([
    supabase
      .from('hackathon_registrations')
      .select('id')
      .eq('hackathon_id', hackathon.id)
      .eq('user_id', user?.id || '')
      .maybeSingle(),
    supabase
      .from('hackathon_registrations')
      .select('*', { count: 'exact', head: true })
      .eq('hackathon_id', hackathon.id),
  ])

  return (
    <HackathonView
      hackathon={hackathon}
      isRegistered={!!registered}
      totalRegistered={totalRegistered || 0}
      currentUserId={user?.id}
    />
  )
}