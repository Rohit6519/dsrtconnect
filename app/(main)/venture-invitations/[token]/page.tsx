import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvitationReviewClient } from './InvitationReviewClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function VentureInvitationPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirect=/venture-invitations/${token}`)
  }

  // Fetch invitation with full context (uses same rules as /api/venture-invitations/[id])
  const { data: invitation, error } = await supabase
    .from('venture_team_invitations')
    .select(`
      *,
      venture:ventures(id, slug, name, tagline, logo_url, cover_url, stage, industry, headquarters, description),
      invited_by:users!invited_by_user_id(id, full_name, username, avatar_url, tagline),
      invited_user:users!invited_user_id(id, full_name, username, avatar_url),
      position:venture_team_positions(id, title, description, position_type, team_name, department, capacity, occupied_count, responsibilities, required_skills)
    `)
    .eq('secure_token', token)
    .maybeSingle()

  if (error || !invitation) {
    return <InvitationNotFound />
  }

  // Authorization: only intended recipient can view
  if (invitation.invited_user_id !== user.id) {
    return <UnauthorizedView />
  }

  // Auto-transition expired invitations
  const isExpired = invitation.expires_at
    && new Date(invitation.expires_at) < new Date()
    && ['sent', 'viewed', 'held'].includes(invitation.status)

  if (isExpired && invitation.status !== 'expired') {
    await supabase
      .from('venture_team_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)
    invitation.status = 'expired'
  }

  // Mark as viewed (idempotent — only first time)
  if (invitation.status === 'sent' && !invitation.viewed_at) {
    await supabase
      .from('venture_team_invitations')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', invitation.id)

    try {
      await supabase.from('venture_team_activity').insert({
        venture_id: invitation.venture_id,
        actor_id: user.id,
        action: 'invitation.viewed',
        target_type: 'invitation',
        target_id: invitation.id
      })
    } catch {}

    invitation.status = 'viewed'
    invitation.viewed_at = new Date().toISOString()
  }

  // If already accepted, redirect to venture
  if (invitation.status === 'accepted' && invitation.venture?.slug) {
    redirect(`/ventures/${invitation.venture.slug}/onboarding?invitation=${invitation.id}`)
  }

  return (
    <InvitationReviewClient
      invitation={invitation}
      currentUserId={user.id}
    />
  )
}

function InvitationNotFound() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#121215] border border-white/[0.06] rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h1 className="text-[18px] font-bold text-white mb-2">Invitation Not Found</h1>
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          This invitation link is invalid, has been revoked, or has already been used.
          If you believe this is a mistake, contact the venture owner.
        </p>
      </div>
    </div>
  )
}

function UnauthorizedView() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#121215] border border-white/[0.06] rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔒</span>
        </div>
        <h1 className="text-[18px] font-bold text-white mb-2">Not Your Invitation</h1>
        <p className="text-[13px] text-zinc-400 leading-relaxed">
          This invitation was sent to a different DSRT account.
          Make sure you're signed in as the intended recipient.
        </p>
      </div>
    </div>
  )
}