import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { InvitationAccept } from '@/components/projects/InvitationAccept'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitationPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: invitation } = await supabase
    .from('project_invitations')
    .select(`
      *,
      projects (id, name, description, icon, color, sector, category),
      inviter:invited_by (full_name, username, avatar_url)
    `)
    .eq('token', token)
    .single()

  if (!invitation) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <InvitationAccept
      invitation={invitation}
      currentUser={user}
    />
  )
}