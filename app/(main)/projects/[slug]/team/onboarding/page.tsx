import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TeamOnboardingClient } from '@/components/project-detail/team/onboarding/TeamOnboardingClient'
import { DsrtPage } from '@/components/dsrt'

export const dynamic = 'force-dynamic'

export default async function TeamOnboardingPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/login?redirect=/projects/${slug}/team/onboarding`)

  // 1. Get project
  const { data: project } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!project) redirect('/projects')

  // 2. Get member record
  const { data: member } = await supabase
    .from('project_members')
    .select('id, member_state, role')
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .single()

  if (!member) redirect(`/projects/${slug}`)
  
  // If they are already active, send them to the workspace
  if (member.member_state === 'active') {
    redirect(`/projects/${slug}?tab=team`)
  }

  // 3. Get onboarding shell and invitation snapshot
  const { data: onboarding } = await supabase
    .from('project_team_onboarding')
    .select('*, invitation:project_team_invitations(snapshot)')
    .eq('member_id', member.id)
    .single()

  if (!onboarding) {
    // Failsafe if shell wasn't created
    redirect(`/projects/${slug}`)
  }

  // 4. Get user profile for Identity step
  const { data: profile } = await supabase
    .from('users')
    .select('full_name, username, avatar_url, email')
    .eq('id', user.id)
    .single()

  return (
    <DsrtPage width="narrow" className="py-10 md:py-16 min-h-screen">
      <TeamOnboardingClient 
        project={project}
        member={member}
        onboarding={onboarding}
        profile={profile}
      />
    </DsrtPage>
  )
}